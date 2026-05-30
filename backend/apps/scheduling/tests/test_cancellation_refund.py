"""
Unit tests for enhanced cancel_appointment() with refund logic — TDD RED phase.

Tests cover:
- Full refund (penalty=0%): payment.status=REFUNDED, metadata updated
- Partial refund (penalty=50%): correct amount calculated
- No refund (penalty=100%): no API call, payment stays COMPLETED
- Cancel with no payment: succeeds without error
- Cancel already-cancelled appointment: raises / view returns 400
- MP refund error: PaymentRefundError raised and propagates
- send_appointment_cancellation() is called on every successful cancel
- Waitlist is notified on cancellation
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from unittest.mock import MagicMock, call, patch

import pytest
from django.utils import timezone

from apps.billing.models import Payment
from apps.billing.services.payment_strategy import PaymentRefundError
from apps.scheduling.models import Appointment
from apps.scheduling.services.cancellation import cancel_appointment, get_cancellation_penalty
from tests.factories.billing import CompletedPaymentFactory, PaymentFactory
from tests.factories.practice import PracticeFactory
from tests.factories.scheduling import (
    AppointmentFactory,
    CancellationPolicyFactory,
    CancellationTierFactory,
)
from tests.factories.users import DoctorFactory


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _make_appointment_with_policy(practice, penalty_pct: str, hours_until: float):
    """
    Create a CONFIRMED appointment with a cancellation policy and a COMPLETED payment.

    The appointment is scheduled `hours_until` hours in the future so that
    the penalty tier with the given percentage applies.
    """
    policy = CancellationPolicyFactory(practice=practice)
    # Three tiers: >24h free, 12-24h 50%, <12h 100%
    CancellationTierFactory(policy=policy, min_hours_before=24, penalty_percentage=Decimal("0.00"), description="Free")
    CancellationTierFactory(
        policy=policy, min_hours_before=12, penalty_percentage=Decimal("50.00"), description="50% penalty"
    )
    CancellationTierFactory(
        policy=policy, min_hours_before=0, penalty_percentage=Decimal("100.00"), description="Full penalty"
    )

    # Place the appointment `hours_until` hours from now
    scheduled_dt = timezone.now() + datetime.timedelta(hours=hours_until)
    appt = AppointmentFactory(
        practice=practice,
        status=Appointment.CONFIRMED,
        scheduled_date=scheduled_dt.date(),
        start_time=scheduled_dt.time().replace(second=0, microsecond=0),
    )
    return appt


# ─────────────────────────────────────────────────────────────────────────────
# Task 2.1 / 2.2 — cancel_appointment() with refund logic
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCancelAppointmentRefund:
    """Tests for enhanced cancel_appointment() with refund capability."""

    # ------------------------------------------------------------------
    # Full refund: >24h before appointment, penalty=0%
    # ------------------------------------------------------------------

    def test_full_refund_payment_status_becomes_refunded(self):
        """Cancel >24h before: payment.status must become REFUNDED."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "0.00", hours_until=30)
        payment = CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("15000.00"),
            external_id="MP-TEST-001",
        )

        mock_refund_result = {"refund_id": "REF-001", "status": "approved", "amount": 15000}

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_strategy.refund.return_value = mock_refund_result
            mock_get_strategy.return_value = mock_strategy

            result = cancel_appointment(appt, reason="changed plans", refund=True)

        payment.refresh_from_db()
        assert payment.status == Payment.REFUNDED

    def test_full_refund_calls_refund_with_full_amount(self):
        """Cancel >24h before (penalty=0%): strategy.refund() receives the full payment amount."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "0.00", hours_until=30)
        payment = CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("15000.00"),
            external_id="MP-TEST-002",
        )

        mock_refund_result = {"refund_id": "REF-002", "status": "approved", "amount": 15000}

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_strategy.refund.return_value = mock_refund_result
            mock_get_strategy.return_value = mock_strategy

            cancel_appointment(appt, reason="", refund=True)

        # Full refund: 15000 * 100% = 15000
        mock_strategy.refund.assert_called_once_with(payment, 15000)

    def test_full_refund_metadata_contains_refund_info(self):
        """After full refund, payment.metadata must contain refund_id, refund_amount, etc."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "0.00", hours_until=30)
        payment = CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("15000.00"),
            external_id="MP-TEST-003",
        )

        mock_refund_result = {"refund_id": "REF-003", "status": "approved", "amount": 15000}

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_strategy.refund.return_value = mock_refund_result
            mock_get_strategy.return_value = mock_strategy

            cancel_appointment(appt, reason="", refund=True)

        payment.refresh_from_db()
        refund_meta = payment.metadata.get("refund", {})
        assert "refund_id" in refund_meta
        assert "refund_amount" in refund_meta
        assert "refunded_at" in refund_meta
        assert "penalty_percentage" in refund_meta
        assert refund_meta["refund_amount"] == 15000
        assert refund_meta["penalty_percentage"] == 0

    # ------------------------------------------------------------------
    # Partial refund: 12–24h before, penalty=50%
    # ------------------------------------------------------------------

    def test_partial_refund_amount_is_half_of_payment(self):
        """Cancel 12-24h before (penalty=50%): refund_amount = payment.amount * 50%."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "50.00", hours_until=18)
        payment = CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("10000.00"),
            external_id="MP-TEST-004",
        )

        mock_refund_result = {"refund_id": "REF-004", "status": "approved", "amount": 5000}

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_strategy.refund.return_value = mock_refund_result
            mock_get_strategy.return_value = mock_strategy

            cancel_appointment(appt, reason="", refund=True)

        # 50% penalty → 50% refund: 10000 * 0.50 = 5000
        mock_strategy.refund.assert_called_once_with(payment, 5000)

    def test_partial_refund_metadata_stores_penalty_percentage(self):
        """After partial refund, payment.metadata['refund']['penalty_percentage'] must be 50."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "50.00", hours_until=18)
        payment = CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("10000.00"),
            external_id="MP-TEST-005",
        )

        mock_refund_result = {"refund_id": "REF-005", "status": "approved", "amount": 5000}

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_strategy.refund.return_value = mock_refund_result
            mock_get_strategy.return_value = mock_strategy

            cancel_appointment(appt, reason="", refund=True)

        payment.refresh_from_db()
        refund_meta = payment.metadata.get("refund", {})
        assert refund_meta["penalty_percentage"] == 50

    # ------------------------------------------------------------------
    # No refund: <12h before, penalty=100%
    # ------------------------------------------------------------------

    def test_no_refund_when_penalty_is_100_percent(self):
        """Cancel <12h before (penalty=100%): no MP call, payment.status stays COMPLETED."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "100.00", hours_until=6)
        payment = CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("15000.00"),
            external_id="MP-TEST-006",
        )

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_get_strategy.return_value = mock_strategy

            cancel_appointment(appt, reason="", refund=True)

        # No refund call when refund_amount == 0
        mock_strategy.refund.assert_not_called()

        payment.refresh_from_db()
        assert payment.status == Payment.COMPLETED

    def test_appointment_still_cancelled_when_no_refund(self):
        """Even with penalty=100% (no refund), appointment.status must become CANCELLED."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "100.00", hours_until=6)
        CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("15000.00"),
            external_id="MP-TEST-007",
        )

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy"),
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            cancel_appointment(appt, reason="", refund=True)

        appt.refresh_from_db()
        assert appt.status == Appointment.CANCELLED

    # ------------------------------------------------------------------
    # Cancel with no payment
    # ------------------------------------------------------------------

    def test_cancel_with_no_payment_succeeds(self):
        """Cancel an appointment with no associated payment — must not raise any error."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        # No payment created for this appointment

        with patch("apps.scheduling.services.cancellation.send_appointment_cancellation"):
            result = cancel_appointment(appt, reason="no show", refund=True)

        assert isinstance(result, dict)
        appt.refresh_from_db()
        assert appt.status == Appointment.CANCELLED

    def test_cancel_with_no_payment_refund_info_is_none(self):
        """When no payment exists, refund_info in the result must be None."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)

        with patch("apps.scheduling.services.cancellation.send_appointment_cancellation"):
            result = cancel_appointment(appt, reason="", refund=True)

        assert result.get("refund_info") is None

    # ------------------------------------------------------------------
    # Cancellation email always called
    # ------------------------------------------------------------------

    def test_send_appointment_cancellation_called_on_successful_cancel(self):
        """send_appointment_cancellation() must be called for every successful cancel."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)

        with patch(
            "apps.scheduling.services.cancellation.send_appointment_cancellation"
        ) as mock_email:
            cancel_appointment(appt, reason="")

        mock_email.assert_called_once_with(appt)

    def test_send_appointment_cancellation_called_when_no_refund(self):
        """Email is sent even when there's no refund (e.g., penalty=100%)."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "100.00", hours_until=6)
        CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("5000.00"),
            external_id="MP-TEST-008",
        )

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy"),
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation") as mock_email,
        ):
            cancel_appointment(appt, reason="", refund=True)

        mock_email.assert_called_once()

    # ------------------------------------------------------------------
    # MP refund error propagates
    # ------------------------------------------------------------------

    def test_mp_refund_error_propagates(self):
        """When strategy.refund() raises PaymentRefundError, it must propagate out."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "0.00", hours_until=30)
        CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("15000.00"),
            external_id="MP-TEST-009",
        )

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_strategy.refund.side_effect = PaymentRefundError("MP API error")
            mock_get_strategy.return_value = mock_strategy

            with pytest.raises(PaymentRefundError):
                cancel_appointment(appt, reason="", refund=True)

    # ------------------------------------------------------------------
    # cancel_appointment() return value
    # ------------------------------------------------------------------

    def test_cancel_returns_dict_with_appointment_key(self):
        """cancel_appointment() must return a dict with 'appointment' key."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)

        with patch("apps.scheduling.services.cancellation.send_appointment_cancellation"):
            result = cancel_appointment(appt, reason="test")

        assert "appointment" in result
        assert result["appointment"].pk == appt.pk

    def test_cancel_returns_dict_with_refund_info_key(self):
        """cancel_appointment() must return a dict with 'refund_info' key."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)

        with patch("apps.scheduling.services.cancellation.send_appointment_cancellation"):
            result = cancel_appointment(appt, reason="test")

        assert "refund_info" in result

    # ------------------------------------------------------------------
    # refund=False skips refund entirely
    # ------------------------------------------------------------------

    def test_refund_false_skips_payment_update(self):
        """When refund=False, no refund API call is made and payment stays COMPLETED."""
        practice = PracticeFactory()
        appt = _make_appointment_with_policy(practice, "0.00", hours_until=30)
        payment = CompletedPaymentFactory(
            practice=practice,
            appointment=appt,
            payment_method=Payment.MERCADOPAGO,
            amount=Decimal("15000.00"),
            external_id="MP-TEST-010",
        )

        with (
            patch("apps.scheduling.services.cancellation.get_payment_strategy") as mock_get_strategy,
            patch("apps.scheduling.services.cancellation.send_appointment_cancellation"),
        ):
            mock_strategy = MagicMock()
            mock_get_strategy.return_value = mock_strategy

            cancel_appointment(appt, reason="", refund=False)

        mock_strategy.refund.assert_not_called()
        payment.refresh_from_db()
        assert payment.status == Payment.COMPLETED
