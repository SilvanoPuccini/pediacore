"""
Tests for transfer payment email notification functions (T-12).

All tests mock Resend so no real network calls are made.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from apps.billing.models import Payment
from apps.notifications.services.email_service import (
    send_transfer_confirmed,
    send_transfer_expired,
    send_transfer_receipt_uploaded,
    send_transfer_rejected,
)
from tests.factories.billing import PaymentFactory
from tests.factories.patients import TutorPatientFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import DoctorFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _patched_send():
    """Patch the low-level resend call in email_service.send_email."""
    return patch(
        "apps.notifications.services.email_service.send_email",
        wraps=_mock_send_email,
    )


def _mock_send_email(to, subject, html_body, practice=None):
    """Minimal mock that records calls without hitting Resend."""
    from apps.notifications.models import EmailLog

    return MagicMock(spec=EmailLog)


# ---------------------------------------------------------------------------
# send_transfer_receipt_uploaded
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendTransferReceiptUploaded:
    def test_sends_to_doctor(self, settings):
        """send_transfer_receipt_uploaded sends email to the practice owner (doctor)."""
        settings.RESEND_API_KEY = ""  # dev mode — no real send

        doctor = DoctorFactory()
        from tests.factories.practice import PracticeFactory

        practice = PracticeFactory(owner=doctor)
        from tests.factories.patients import PatientFactory

        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.TRANSFER,
            amount="35000.00",
        )

        with patch(
            "apps.notifications.services.email_service.send_email"
        ) as mock_email:
            from apps.notifications.models import EmailLog

            mock_email.return_value = MagicMock(spec=EmailLog)
            send_transfer_receipt_uploaded(payment)

        mock_email.assert_called_once()
        call_args = mock_email.call_args
        assert call_args.kwargs.get("to") == doctor.email or call_args.args[0] == doctor.email

    def test_subject_mentions_amount(self, settings):
        """Subject line should include the CLP amount."""
        settings.RESEND_API_KEY = ""

        doctor = DoctorFactory()
        from tests.factories.practice import PracticeFactory

        practice = PracticeFactory(owner=doctor)
        from tests.factories.patients import PatientFactory

        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.TRANSFER,
            amount="35000.00",
        )

        with patch(
            "apps.notifications.services.email_service.send_email"
        ) as mock_email:
            from apps.notifications.models import EmailLog

            mock_email.return_value = MagicMock(spec=EmailLog)
            send_transfer_receipt_uploaded(payment)

        call_args = mock_email.call_args
        subject = call_args.kwargs.get("subject") or call_args.args[1]
        assert "35" in subject  # "35.000" is in subject


# ---------------------------------------------------------------------------
# send_transfer_confirmed
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendTransferConfirmed:
    def test_sends_to_tutor(self, settings):
        """send_transfer_confirmed sends email to tutors linked to the patient."""
        settings.RESEND_API_KEY = ""

        doctor = DoctorFactory()
        from tests.factories.practice import PracticeFactory

        practice = PracticeFactory(owner=doctor)
        from tests.factories.patients import PatientFactory

        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.TRANSFER,
            status=Payment.COMPLETED,
            amount="35000.00",
        )

        with patch(
            "apps.notifications.services.email_service.send_email"
        ) as mock_email:
            from apps.notifications.models import EmailLog

            mock_email.return_value = MagicMock(spec=EmailLog)
            send_transfer_confirmed(payment)

        assert mock_email.call_count >= 1
        call_args = mock_email.call_args
        recipient = call_args.kwargs.get("to") or call_args.args[0]
        assert recipient == tutor.email


# ---------------------------------------------------------------------------
# send_transfer_rejected
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendTransferRejected:
    def test_sends_to_tutor_with_reason(self, settings):
        """send_transfer_rejected sends email to tutor and includes the reason."""
        settings.RESEND_API_KEY = ""

        doctor = DoctorFactory()
        from tests.factories.practice import PracticeFactory

        practice = PracticeFactory(owner=doctor)
        from tests.factories.patients import PatientFactory

        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.TRANSFER,
            status=Payment.FAILED,
            amount="35000.00",
        )

        rejection_reason = "El monto no coincide con el valor de la consulta."

        with patch(
            "apps.notifications.services.email_service.send_email"
        ) as mock_email:
            from apps.notifications.models import EmailLog

            mock_email.return_value = MagicMock(spec=EmailLog)
            send_transfer_rejected(payment, reason=rejection_reason)

        mock_email.assert_called_once()
        call_args = mock_email.call_args
        html_body = call_args.kwargs.get("html_body") or call_args.args[2]
        assert rejection_reason in html_body

    def test_recipient_is_tutor_not_doctor(self, settings):
        """Rejection email goes to tutor, not doctor."""
        settings.RESEND_API_KEY = ""

        doctor = DoctorFactory()
        from tests.factories.practice import PracticeFactory

        practice = PracticeFactory(owner=doctor)
        from tests.factories.patients import PatientFactory

        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.TRANSFER,
            amount="35000.00",
        )

        with patch(
            "apps.notifications.services.email_service.send_email"
        ) as mock_email:
            from apps.notifications.models import EmailLog

            mock_email.return_value = MagicMock(spec=EmailLog)
            send_transfer_rejected(payment, reason="Comprobante ilegible.")

        call_args = mock_email.call_args
        recipient = call_args.kwargs.get("to") or call_args.args[0]
        assert recipient == tutor.email
        assert recipient != doctor.email


# ---------------------------------------------------------------------------
# send_transfer_expired
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendTransferExpired:
    def test_sends_to_tutor(self, settings):
        """send_transfer_expired sends email to tutors linked to the patient."""
        settings.RESEND_API_KEY = ""

        doctor = DoctorFactory()
        from tests.factories.practice import PracticeFactory

        practice = PracticeFactory(owner=doctor)
        from tests.factories.patients import PatientFactory

        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.TRANSFER,
            status=Payment.FAILED,
        )

        with patch(
            "apps.notifications.services.email_service.send_email"
        ) as mock_email:
            from apps.notifications.models import EmailLog

            mock_email.return_value = MagicMock(spec=EmailLog)
            send_transfer_expired(payment)

        mock_email.assert_called_once()
        call_args = mock_email.call_args
        recipient = call_args.kwargs.get("to") or call_args.args[0]
        assert recipient == tutor.email

    def test_body_mentions_cancellation(self, settings):
        """Expiry email body should mention cancellation or turno cancelado."""
        settings.RESEND_API_KEY = ""

        doctor = DoctorFactory()
        from tests.factories.practice import PracticeFactory

        practice = PracticeFactory(owner=doctor)
        from tests.factories.patients import PatientFactory

        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            payment_method=Payment.TRANSFER,
        )

        with patch(
            "apps.notifications.services.email_service.send_email"
        ) as mock_email:
            from apps.notifications.models import EmailLog

            mock_email.return_value = MagicMock(spec=EmailLog)
            send_transfer_expired(payment)

        call_args = mock_email.call_args
        html_body = call_args.kwargs.get("html_body") or call_args.args[2]
        # Should mention cancelado/comprobante or similar
        assert "cancelad" in html_body.lower() or "comprobante" in html_body.lower()
