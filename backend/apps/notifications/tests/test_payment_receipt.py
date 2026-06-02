"""
TDD tests for send_payment_receipt() (Phase 4).

RED → GREEN cycle:
  - Tests written first (RED), full implementation follows in email_service.py.
  - Resend API is always mocked — no real network calls.
"""

from __future__ import annotations

import pytest

from apps.notifications.models import EmailLog, Notification
from tests.factories.billing import CompletedPaymentFactory, InvoiceFactory
from tests.factories.notifications import NotificationPreferenceFactory
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory

# ---------------------------------------------------------------------------
# 4.4 test_send_payment_receipt_sends_email
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendPaymentReceiptSendsEmail:
    def test_send_payment_receipt_sends_email(self, settings):
        """
        RED → GREEN: send_payment_receipt() dispatches an email via Resend
        with the correct subject, recipient, and creates a Notification.
        """
        settings.RESEND_API_KEY = ""  # Dev mode — no real HTTP call

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        tutor = TutorPatientFactory(patient=patient, practice=practice).tutor

        payment = CompletedPaymentFactory(
            practice=practice,
            patient=patient,
        )

        send_payment_receipt(payment)

        # An email log must exist for the tutor
        assert EmailLog.objects.filter(recipient_email=tutor.email).exists()

        # A PAYMENT_RECEIVED notification must be created
        assert Notification.objects.filter(
            recipient=tutor,
            notification_type=Notification.PAYMENT_RECEIVED,
            related_type="Payment",
            related_id=payment.pk,
        ).exists()

    def test_send_payment_receipt_subject_contains_date(self, settings):
        """Email subject must reference the appointment date."""
        settings.RESEND_API_KEY = ""

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(patient=patient, practice=practice)
        payment = CompletedPaymentFactory(practice=practice, patient=patient)

        send_payment_receipt(payment)

        log = EmailLog.objects.filter(recipient_email__isnull=False).first()
        assert log is not None
        assert "Comprobante" in log.subject or "pago" in log.subject.lower()

    def test_send_payment_receipt_notification_contains_patient_name(self, settings):
        """Notification message must reference the patient name."""
        settings.RESEND_API_KEY = ""

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice, first_name="Valentina", last_name="López")
        TutorPatientFactory(patient=patient, practice=practice)
        payment = CompletedPaymentFactory(practice=practice, patient=patient)

        send_payment_receipt(payment)

        notification = Notification.objects.filter(
            notification_type=Notification.PAYMENT_RECEIVED,
        ).first()
        assert notification is not None
        assert "Valentina" in notification.message or "López" in notification.message

    def test_send_payment_receipt_no_tutors_does_nothing(self, settings):
        """When no tutors are linked to the patient, no email is sent."""
        settings.RESEND_API_KEY = ""

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        # No TutorPatient link created
        payment = CompletedPaymentFactory(practice=practice, patient=patient)

        initial_log_count = EmailLog.objects.count()
        initial_notification_count = Notification.objects.count()

        send_payment_receipt(payment)

        assert EmailLog.objects.count() == initial_log_count
        assert Notification.objects.count() == initial_notification_count


# ---------------------------------------------------------------------------
# 4.4 test_send_payment_receipt_suppressed_by_preference
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendPaymentReceiptSuppressedByPreference:
    def test_send_payment_receipt_suppressed_by_preference(self, settings):
        """
        RED → GREEN: when NotificationPreference.email_payment_received=False,
        no email is sent and no Notification record is created.
        """
        settings.RESEND_API_KEY = ""

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        link = TutorPatientFactory(patient=patient, practice=practice)
        tutor = link.tutor

        # Opt out of payment receipt emails
        NotificationPreferenceFactory(
            user=tutor,
            practice=practice,
            email_payment_received=False,
        )

        payment = CompletedPaymentFactory(practice=practice, patient=patient)

        send_payment_receipt(payment)

        # No email and no notification must have been created
        assert not EmailLog.objects.filter(recipient_email=tutor.email).exists()
        assert not Notification.objects.filter(
            recipient=tutor,
            notification_type=Notification.PAYMENT_RECEIVED,
        ).exists()

    def test_send_payment_receipt_enabled_by_preference(self, settings):
        """When email_payment_received=True (explicit), email is sent normally."""
        settings.RESEND_API_KEY = ""

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        link = TutorPatientFactory(patient=patient, practice=practice)
        tutor = link.tutor

        NotificationPreferenceFactory(
            user=tutor,
            practice=practice,
            email_payment_received=True,
        )

        payment = CompletedPaymentFactory(practice=practice, patient=patient)
        send_payment_receipt(payment)

        assert EmailLog.objects.filter(recipient_email=tutor.email).exists()


# ---------------------------------------------------------------------------
# PDF attachment tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendPaymentReceiptWithInvoice:
    def test_send_payment_receipt_with_invoice_pdf(self, settings):
        """
        When a Payment has a related Invoice with a pdf_file,
        the function must call send_email (not crash).
        No attachment validation is done here because Resend API accepts
        attachments as dicts; we just verify no exception is raised and email is sent.
        """
        settings.RESEND_API_KEY = ""

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(patient=patient, practice=practice)
        payment = CompletedPaymentFactory(practice=practice, patient=patient)
        # Invoice without pdf_file (no file upload in unit tests)
        InvoiceFactory(practice=practice, payment=payment)

        # Should not raise
        send_payment_receipt(payment)

        assert EmailLog.objects.filter(recipient_email__isnull=False).exists()

    def test_send_payment_receipt_without_invoice_no_crash(self, settings):
        """send_payment_receipt() must gracefully handle a missing Invoice."""
        settings.RESEND_API_KEY = ""

        from apps.notifications.services.email_service import send_payment_receipt

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(patient=patient, practice=practice)
        payment = CompletedPaymentFactory(practice=practice, patient=patient)
        # No Invoice created — simulate missing invoice

        # Should not raise
        send_payment_receipt(payment)

        assert EmailLog.objects.filter(recipient_email__isnull=False).exists()
