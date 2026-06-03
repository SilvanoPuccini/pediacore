"""
Tests for PaymentViewSet transfer actions (T-09, T-10).

Covers:
  - upload-receipt: owner upload, 403 non-owner, 400 wrong status/method, file validation
  - confirm-transfer: doctor confirms, 403 tutor, 400 wrong status, invoice created, email sent
  - reject-transfer: doctor rejects with reason, 403 tutor, 400 wrong status/missing reason
"""

from __future__ import annotations

import io
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.billing.models import Invoice, Payment
from apps.scheduling.models import Appointment
from tests.factories.billing import PaymentFactory
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import DoctorFactory, UserFactory


def auth_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def make_transfer_payment(practice, tutor, appointment=None):
    """Helper: create a PENDING TRANSFER payment owned by tutor."""
    patient = PatientFactory(practice=practice)
    TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
    if appointment is None:
        appointment = AppointmentFactory(
            practice=practice,
            patient=patient,
            status=Appointment.PENDING,
        )
    return PaymentFactory(
        practice=practice,
        patient=patient,
        appointment=appointment,
        paid_by=tutor,
        payment_method=Payment.TRANSFER,
        status=Payment.PENDING,
    )


def small_pdf() -> SimpleUploadedFile:
    """Return a minimal valid-looking PDF upload (3 KB)."""
    content = b"%PDF-1.4 fake pdf content " + b"x" * 3000
    return SimpleUploadedFile("receipt.pdf", content, content_type="application/pdf")


def large_file() -> SimpleUploadedFile:
    """Return a file exceeding 10 MB."""
    content = b"x" * (11 * 1024 * 1024)
    return SimpleUploadedFile("big.pdf", content, content_type="application/pdf")


def invalid_type_file() -> SimpleUploadedFile:
    """Return a file with a disallowed extension."""
    return SimpleUploadedFile("script.txt", b"hello world", content_type="text/plain")


# ---------------------------------------------------------------------------
# T-09: upload-receipt endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUploadReceiptEndpoint:
    def test_upload_receipt_success(self):
        """Tutor who owns payment can upload receipt — returns 200 with receipt_uploaded_at."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        with patch("apps.billing.views.send_transfer_receipt_uploaded"):
            client = auth_client(tutor)
            response = client.post(
                f"/api/v1/payments/{payment.pk}/upload-receipt/",
                {"receipt": small_pdf()},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "pending"
        assert response.data["receipt_uploaded_at"] is not None

        payment.refresh_from_db()
        assert payment.receipt_uploaded_at is not None
        assert bool(payment.receipt_file)

    def test_upload_receipt_wrong_owner_returns_403(self):
        """A different tutor cannot upload a receipt for another user's payment."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        owner_tutor = UserFactory()
        other_tutor = UserFactory()
        payment = make_transfer_payment(practice, owner_tutor)

        client = auth_client(other_tutor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/upload-receipt/",
            {"receipt": small_pdf()},
            format="multipart",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_upload_receipt_wrong_payment_method_returns_400(self):
        """Cannot upload receipt for a non-TRANSFER payment."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        mp_payment = PaymentFactory(
            practice=practice,
            patient=patient,
            paid_by=tutor,
            payment_method=Payment.MERCADOPAGO,
            status=Payment.PENDING,
        )

        client = auth_client(tutor)
        response = client.post(
            f"/api/v1/payments/{mp_payment.pk}/upload-receipt/",
            {"receipt": small_pdf()},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_receipt_wrong_status_returns_400(self):
        """Cannot upload receipt for a completed payment."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        completed_payment = PaymentFactory(
            practice=practice,
            patient=patient,
            paid_by=tutor,
            payment_method=Payment.TRANSFER,
            status=Payment.COMPLETED,
        )

        client = auth_client(tutor)
        response = client.post(
            f"/api/v1/payments/{completed_payment.pk}/upload-receipt/",
            {"receipt": small_pdf()},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_receipt_file_too_large_returns_400(self):
        """File exceeding 10 MB is rejected with 400."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        client = auth_client(tutor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/upload-receipt/",
            {"receipt": large_file()},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_receipt_invalid_type_returns_400(self):
        """File with disallowed extension is rejected with 400."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        client = auth_client(tutor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/upload-receipt/",
            {"receipt": invalid_type_file()},
            format="multipart",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_receipt_sends_email_to_doctor(self):
        """On successful upload, send_transfer_receipt_uploaded is called with the payment."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        with patch(
            "apps.billing.views.send_transfer_receipt_uploaded"
        ) as mock_send:
            client = auth_client(tutor)
            response = client.post(
                f"/api/v1/payments/{payment.pk}/upload-receipt/",
                {"receipt": small_pdf()},
                format="multipart",
            )

        assert response.status_code == status.HTTP_200_OK
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0]
        assert call_args[0].pk == payment.pk

    def test_upload_receipt_doctor_cannot_use_tutor_endpoint(self):
        """Doctor role cannot hit the IsTutor-protected endpoint."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        client = auth_client(doctor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/upload-receipt/",
            {"receipt": small_pdf()},
            format="multipart",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# T-10: confirm-transfer and reject-transfer endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestConfirmTransferEndpoint:
    def test_confirm_transfer_success(self):
        """Doctor can confirm a pending transfer — Payment→COMPLETED, Appointment→CONFIRMED."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        with (
            patch("apps.billing.views.create_invoice_for_payment") as mock_invoice,
            patch("apps.billing.views.generate_invoice_pdf"),
            patch("apps.billing.views.send_transfer_confirmed"),
            patch("apps.billing.views.send_appointment_confirmation"),
        ):
            mock_invoice.return_value = None
            client = auth_client(doctor)
            response = client.post(
                f"/api/v1/payments/{payment.pk}/confirm-transfer/",
                {"notes": ""},
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "completed"

        payment.refresh_from_db()
        assert payment.status == Payment.COMPLETED
        assert payment.paid_at is not None

        payment.appointment.refresh_from_db()
        assert payment.appointment.status == Appointment.CONFIRMED

    def test_confirm_transfer_creates_invoice(self):
        """confirm-transfer calls create_invoice_for_payment."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        with (
            patch("apps.billing.views.create_invoice_for_payment") as mock_invoice,
            patch("apps.billing.views.generate_invoice_pdf"),
            patch("apps.billing.views.send_transfer_confirmed"),
            patch("apps.billing.views.send_appointment_confirmation"),
        ):
            mock_invoice.return_value = None
            client = auth_client(doctor)
            client.post(
                f"/api/v1/payments/{payment.pk}/confirm-transfer/",
                format="json",
            )

        mock_invoice.assert_called_once()
        assert mock_invoice.call_args[0][0].pk == payment.pk

    def test_confirm_transfer_sends_email(self):
        """confirm-transfer calls send_transfer_confirmed."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        with (
            patch("apps.billing.views.create_invoice_for_payment"),
            patch("apps.billing.views.generate_invoice_pdf"),
            patch("apps.billing.views.send_transfer_confirmed") as mock_email,
            patch("apps.billing.views.send_appointment_confirmation"),
        ):
            client = auth_client(doctor)
            client.post(
                f"/api/v1/payments/{payment.pk}/confirm-transfer/",
                format="json",
            )

        mock_email.assert_called_once()

    def test_confirm_transfer_forbidden_for_tutor(self):
        """Tutor cannot call confirm-transfer — 403."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        client = auth_client(tutor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/confirm-transfer/",
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_confirm_transfer_wrong_status_returns_400(self):
        """Cannot confirm a payment that is not PENDING."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            paid_by=tutor,
            payment_method=Payment.TRANSFER,
            status=Payment.COMPLETED,
        )

        client = auth_client(doctor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/confirm-transfer/",
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_transfer_wrong_method_returns_400(self):
        """Cannot confirm a non-TRANSFER payment via confirm-transfer."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        mp_payment = PaymentFactory(
            practice=practice,
            patient=patient,
            paid_by=tutor,
            payment_method=Payment.MERCADOPAGO,
            status=Payment.PENDING,
        )

        client = auth_client(doctor)
        response = client.post(
            f"/api/v1/payments/{mp_payment.pk}/confirm-transfer/",
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestRejectTransferEndpoint:
    def test_reject_transfer_success(self):
        """Doctor can reject a pending transfer — Payment→FAILED, Appointment→CANCELLED."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        with patch("apps.billing.views.send_transfer_rejected") as mock_email:
            client = auth_client(doctor)
            response = client.post(
                f"/api/v1/payments/{payment.pk}/reject-transfer/",
                {"reason": "Amount does not match."},
                format="json",
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "rejected"

        payment.refresh_from_db()
        assert payment.status == Payment.FAILED

        payment.appointment.refresh_from_db()
        assert payment.appointment.status == Appointment.CANCELLED

        mock_email.assert_called_once()

    def test_reject_transfer_sends_email_with_reason(self):
        """Rejection email is called with the correct reason string."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)
        rejection_reason = "Beneficiary name does not match."

        with patch("apps.billing.views.send_transfer_rejected") as mock_email:
            client = auth_client(doctor)
            client.post(
                f"/api/v1/payments/{payment.pk}/reject-transfer/",
                {"reason": rejection_reason},
                format="json",
            )

        mock_email.assert_called_once()
        _, called_reason = mock_email.call_args[0]
        assert called_reason == rejection_reason

    def test_reject_transfer_missing_reason_returns_400(self):
        """Reject without 'reason' body returns 400."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        client = auth_client(doctor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/reject-transfer/",
            {},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reject_transfer_forbidden_for_tutor(self):
        """Tutor cannot call reject-transfer — 403."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        payment = make_transfer_payment(practice, tutor)

        client = auth_client(tutor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/reject-transfer/",
            {"reason": "Some reason."},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_reject_transfer_wrong_status_returns_400(self):
        """Cannot reject a payment that is not PENDING."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            paid_by=tutor,
            payment_method=Payment.TRANSFER,
            status=Payment.FAILED,
        )

        client = auth_client(doctor)
        response = client.post(
            f"/api/v1/payments/{payment.pk}/reject-transfer/",
            {"reason": "Too late."},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
