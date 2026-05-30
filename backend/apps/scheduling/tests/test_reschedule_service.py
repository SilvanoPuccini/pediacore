"""
Unit tests for reschedule_appointment() service — TDD RED phase (Batch 2).

Tests cover:
- Happy path: CONFIRMED → new CONFIRMED, old RESCHEDULED
- Payment FK transferred to new appointment
- Old tokens invalidated (used_at set)
- New tokens created for new appointment
- Slot conflict → raises SlotUnavailableError, no mutation
- Non-CONFIRMED appointment → raises AppointmentNotReschedulableError
- Waitlist notified (mock)
- Reschedule email sent (mock)
- Old appointment retains rescheduled_from chain on new appointment
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.billing.models import Payment
from apps.scheduling.models import Appointment, AppointmentToken
from apps.scheduling.services.booking_service import SlotUnavailableError
from apps.scheduling.services.reschedule_service import (
    AppointmentNotReschedulableError,
    reschedule_appointment,
)
from tests.factories.billing import CompletedPaymentFactory, PaymentFactory
from tests.factories.scheduling import AppointmentFactory, AppointmentTokenFactory
from tests.factories.users import UserFactory


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _confirmed_appointment(**kwargs) -> Appointment:
    """Create a CONFIRMED appointment with tomorrow as the scheduled date."""
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    return AppointmentFactory(
        status=Appointment.CONFIRMED,
        scheduled_date=tomorrow,
        start_time=datetime.time(9, 0),
        **kwargs,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Happy path
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRescheduleAppointmentHappyPath:
    """Successful reschedule creates new CONFIRMED appointment and marks old RESCHEDULED."""

    def test_new_appointment_is_created(self):
        """reschedule_appointment() returns a new Appointment instance."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        assert new_appt is not None
        assert new_appt.pk != old.pk

    def test_new_appointment_is_confirmed(self):
        """New appointment has status=CONFIRMED."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        assert new_appt.status == Appointment.CONFIRMED

    def test_old_appointment_is_rescheduled(self):
        """Old appointment status becomes RESCHEDULED after reschedule."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            reschedule_appointment(old, new_date, new_time, user)

        old.refresh_from_db()
        assert old.status == Appointment.RESCHEDULED

    def test_old_appointment_rescheduled_at_is_set(self):
        """Old appointment rescheduled_at is set to a non-null datetime."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            reschedule_appointment(old, new_date, new_time, user)

        old.refresh_from_db()
        assert old.rescheduled_at is not None

    def test_new_appointment_links_to_old_via_rescheduled_from(self):
        """New appointment has rescheduled_from pointing to the old appointment."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        assert new_appt.rescheduled_from_id == old.pk

    def test_new_appointment_copies_core_fields(self):
        """New appointment copies practice, patient, service, location, doctor from old."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        assert new_appt.practice_id == old.practice_id
        assert new_appt.patient_id == old.patient_id
        assert new_appt.service_id == old.service_id
        assert new_appt.location_id == old.location_id
        assert new_appt.doctor_id == old.doctor_id

    def test_new_appointment_has_correct_date_and_time(self):
        """New appointment has the requested new_date and new_time."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(14, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        assert new_appt.scheduled_date == new_date
        assert new_appt.start_time == new_time

    def test_new_appointment_reminder_flags_are_false(self):
        """New appointment starts with reminder_24h_sent=False and reminder_2h_sent=False."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        assert new_appt.reminder_24h_sent is False
        assert new_appt.reminder_2h_sent is False


# ─────────────────────────────────────────────────────────────────────────────
# Payment FK transfer
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestReschedulePaymentTransfer:
    """Payment FK is transferred atomically from old to new appointment."""

    def test_payment_fk_points_to_new_appointment(self):
        """After reschedule, payment.appointment == new_appointment."""
        old = _confirmed_appointment()
        payment = CompletedPaymentFactory(
            practice=old.practice,
            appointment=old,
            patient=old.patient,
            amount=Decimal("15000.00"),
        )
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        payment.refresh_from_db()
        assert payment.appointment_id == new_appt.pk

    def test_old_appointment_has_no_payment_after_transfer(self):
        """After payment FK transfer, accessing old_appointment.payment raises DoesNotExist."""
        old = _confirmed_appointment()
        CompletedPaymentFactory(
            practice=old.practice,
            appointment=old,
            patient=old.patient,
            amount=Decimal("15000.00"),
        )
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            reschedule_appointment(old, new_date, new_time, user)

        old.refresh_from_db()
        with pytest.raises(Payment.DoesNotExist):
            _ = old.payment

    def test_reschedule_succeeds_when_no_payment(self):
        """Reschedule works even if no payment is associated."""
        old = _confirmed_appointment()
        # No payment created
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        assert new_appt.status == Appointment.CONFIRMED


# ─────────────────────────────────────────────────────────────────────────────
# Token handling
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRescheduleTokenHandling:
    """Old tokens are invalidated and new ones are created post-transaction."""

    def test_old_tokens_are_invalidated_inside_transaction(self):
        """All unused tokens for old appointment have used_at set after reschedule."""
        old = _confirmed_appointment()
        token_confirm = AppointmentTokenFactory(
            appointment=old,
            practice=old.practice,
            action=AppointmentToken.CONFIRM,
            used_at=None,
        )
        token_cancel = AppointmentTokenFactory(
            appointment=old,
            practice=old.practice,
            action=AppointmentToken.CANCEL,
            used_at=None,
        )
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            reschedule_appointment(old, new_date, new_time, user)

        token_confirm.refresh_from_db()
        token_cancel.refresh_from_db()
        assert token_confirm.used_at is not None
        assert token_cancel.used_at is not None

    def test_create_tokens_called_for_new_appointment(self):
        """create_tokens_for_appointment() is called with the new appointment."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch(
                "apps.scheduling.services.reschedule_service.create_tokens_for_appointment"
            ) as mock_create_tokens,
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        mock_create_tokens.assert_called_once_with(new_appt)


# ─────────────────────────────────────────────────────────────────────────────
# Post-transaction notifications
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestReschedulePostTransactionNotifications:
    """Waitlist and email notifications are called after the transaction commits."""

    def test_waitlist_notified_with_old_appointment(self):
        """notify_waitlist_on_cancellation() is called with the old appointment."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch(
                "apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"
            ) as mock_waitlist,
            patch("apps.scheduling.services.reschedule_service.send_appointment_reschedule"),
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            reschedule_appointment(old, new_date, new_time, user)

        mock_waitlist.assert_called_once_with(old)

    def test_reschedule_email_sent_with_new_appointment(self):
        """send_appointment_reschedule() is called with the new appointment."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)
        user = UserFactory()

        with (
            patch("apps.scheduling.services.reschedule_service.notify_waitlist_on_cancellation"),
            patch(
                "apps.scheduling.services.reschedule_service.send_appointment_reschedule"
            ) as mock_email,
            patch("apps.scheduling.services.reschedule_service.create_tokens_for_appointment"),
        ):
            new_appt = reschedule_appointment(old, new_date, new_time, user)

        mock_email.assert_called_once_with(new_appt)


# ─────────────────────────────────────────────────────────────────────────────
# Error cases
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestRescheduleErrorCases:
    """Error cases: non-CONFIRMED status and slot conflicts."""

    def test_non_confirmed_raises_appointment_not_reschedulable(self):
        """Calling reschedule on a HOLD/CANCELLED/RESCHEDULED appointment raises error."""
        for bad_status in (
            Appointment.HOLD,
            Appointment.PENDING,
            Appointment.CANCELLED,
            Appointment.RESCHEDULED,
        ):
            appt = AppointmentFactory(status=bad_status)
            new_date = datetime.date.today() + datetime.timedelta(days=8)
            new_time = datetime.time(10, 0)
            user = UserFactory()

            with pytest.raises(AppointmentNotReschedulableError):
                reschedule_appointment(appt, new_date, new_time, user)

    def test_slot_conflict_raises_slot_unavailable_error(self):
        """
        When the target slot is already taken, SlotUnavailableError is raised
        and neither appointment is mutated.
        """
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)

        # Create a blocking appointment on the same slot/location
        blocking = AppointmentFactory(
            practice=old.practice,
            location=old.location,
            scheduled_date=new_date,
            start_time=new_time,
            # Use same service so duration matches
            service=old.service,
            status=Appointment.CONFIRMED,
        )

        user = UserFactory()
        with pytest.raises(SlotUnavailableError):
            reschedule_appointment(old, new_date, new_time, user)

        # Old appointment must remain CONFIRMED (rollback verified)
        old.refresh_from_db()
        assert old.status == Appointment.CONFIRMED

    def test_slot_conflict_does_not_mutate_old_appointment(self):
        """On slot conflict, old appointment's rescheduled_at remains None."""
        old = _confirmed_appointment()
        new_date = datetime.date.today() + datetime.timedelta(days=8)
        new_time = datetime.time(10, 0)

        # Blocking appointment
        AppointmentFactory(
            practice=old.practice,
            location=old.location,
            scheduled_date=new_date,
            start_time=new_time,
            service=old.service,
            status=Appointment.CONFIRMED,
        )

        user = UserFactory()
        with pytest.raises(SlotUnavailableError):
            reschedule_appointment(old, new_date, new_time, user)

        old.refresh_from_db()
        assert old.rescheduled_at is None
