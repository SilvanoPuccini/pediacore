"""
Tests for expire_pending_transfers() django-q2 job (T-11).

Covers:
  - Expired PENDING TRANSFER payments are set to FAILED, appointment CANCELLED
  - Payments with receipt uploaded are still expired (doctor must confirm)
  - Non-expired transfers (future transfer_expires_at) are not touched
  - Expiry email is sent for each expired payment
  - MercadoPago PENDING payments are not touched by this job
"""

from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.billing.models import Payment
from apps.scheduling.models import Appointment
from tests.factories.billing import PaymentFactory
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import UserFactory


def make_transfer_payment(
    practice,
    patient,
    appointment,
    *,
    transfer_expires_at,
    receipt_uploaded_at=None,
):
    """Helper: create a PENDING TRANSFER Payment with given expiry."""
    return PaymentFactory(
        practice=practice,
        patient=patient,
        appointment=appointment,
        payment_method=Payment.TRANSFER,
        status=Payment.PENDING,
        transfer_expires_at=transfer_expires_at,
        receipt_uploaded_at=receipt_uploaded_at,
    )


def _past(hours=49):
    return timezone.now() - datetime.timedelta(hours=hours)


def _future(hours=24):
    return timezone.now() + datetime.timedelta(hours=hours)


@pytest.mark.django_db
class TestExpirePendingTransfers:
    def test_expired_transfer_gets_cancelled(self):
        """Expired PENDING TRANSFER → Payment=FAILED, Appointment=CANCELLED."""
        from apps.billing.services.transfer_expiry import expire_pending_transfers

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(
            practice=practice, patient=patient, status=Appointment.PENDING
        )
        payment = make_transfer_payment(
            practice, patient, appointment, transfer_expires_at=_past()
        )

        with patch(
            "apps.billing.services.transfer_expiry.send_transfer_expired"
        ):
            count = expire_pending_transfers()

        payment.refresh_from_db()
        appointment.refresh_from_db()

        assert count >= 1
        assert payment.status == Payment.FAILED
        assert appointment.status == Appointment.CANCELLED

    def test_fresh_transfer_not_expired(self):
        """Transfer with future transfer_expires_at is not touched."""
        from apps.billing.services.transfer_expiry import expire_pending_transfers

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(
            practice=practice, patient=patient, status=Appointment.PENDING
        )
        payment = make_transfer_payment(
            practice, patient, appointment, transfer_expires_at=_future()
        )

        with patch("apps.billing.services.transfer_expiry.send_transfer_expired"):
            expire_pending_transfers()

        payment.refresh_from_db()
        appointment.refresh_from_db()

        assert payment.status == Payment.PENDING
        assert appointment.status == Appointment.PENDING

    def test_transfer_with_receipt_still_expired(self):
        """
        A transfer that has a receipt uploaded but has passed 48h is still expired.
        Doctor confirmation is required — a receipt alone doesn't prevent expiry.
        """
        from apps.billing.services.transfer_expiry import expire_pending_transfers

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(
            practice=practice, patient=patient, status=Appointment.PENDING
        )
        # Receipt was uploaded but transfer_expires_at has passed
        payment = make_transfer_payment(
            practice,
            patient,
            appointment,
            transfer_expires_at=_past(),
            receipt_uploaded_at=timezone.now() - datetime.timedelta(hours=5),
        )

        with patch("apps.billing.services.transfer_expiry.send_transfer_expired"):
            count = expire_pending_transfers()

        payment.refresh_from_db()
        assert count >= 1
        assert payment.status == Payment.FAILED

    def test_sends_expiry_email(self):
        """send_transfer_expired is called once per expired payment."""
        from apps.billing.services.transfer_expiry import expire_pending_transfers

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(
            practice=practice, patient=patient, status=Appointment.PENDING
        )
        payment = make_transfer_payment(
            practice, patient, appointment, transfer_expires_at=_past()
        )

        with patch(
            "apps.billing.services.transfer_expiry.send_transfer_expired"
        ) as mock_email:
            expire_pending_transfers()

        mock_email.assert_called_once()
        assert mock_email.call_args[0][0].pk == payment.pk

    def test_does_not_touch_mercadopago_payments(self):
        """PENDING MercadoPago payments are never affected by this job."""
        from apps.billing.services.transfer_expiry import expire_pending_transfers

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(
            practice=practice, patient=patient, status=Appointment.PENDING
        )
        mp_payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.MERCADOPAGO,
            status=Payment.PENDING,
            # Set transfer_expires_at in the past to verify the job still won't
            # touch it because payment_method != TRANSFER
            transfer_expires_at=_past(),
        )

        with patch("apps.billing.services.transfer_expiry.send_transfer_expired"):
            expire_pending_transfers()

        mp_payment.refresh_from_db()
        assert mp_payment.status == Payment.PENDING

    def test_returns_correct_count(self):
        """Returns the count of payments expired in this run."""
        from apps.billing.services.transfer_expiry import expire_pending_transfers

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)

        for _ in range(3):
            appt = AppointmentFactory(
                practice=practice, patient=patient, status=Appointment.PENDING
            )
            make_transfer_payment(practice, patient, appt, transfer_expires_at=_past())

        with patch("apps.billing.services.transfer_expiry.send_transfer_expired"):
            count = expire_pending_transfers()

        assert count >= 3

    def test_idempotent_second_run_returns_zero(self):
        """Running the job twice on the same payment returns 0 on the second run."""
        from apps.billing.services.transfer_expiry import expire_pending_transfers

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(
            practice=practice, patient=patient, status=Appointment.PENDING
        )
        make_transfer_payment(practice, patient, appointment, transfer_expires_at=_past())

        with patch("apps.billing.services.transfer_expiry.send_transfer_expired"):
            first = expire_pending_transfers()
            second = expire_pending_transfers()

        assert first >= 1
        assert second == 0
