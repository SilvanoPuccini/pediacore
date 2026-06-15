"""
Tests for Gemini OCR service (T-19).

Covers:
  - analyze_receipt_with_gemini stores ocr_result in metadata
  - graceful handling when GEMINI_API_KEY is not set
  - graceful handling when Gemini returns invalid JSON
  - confidence calculation logic
  - upload_receipt view enqueues OCR async task
"""

from __future__ import annotations

import json
from decimal import Decimal
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.test import APIClient

from apps.billing.models import Payment
from tests.factories.billing import PaymentFactory
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import DoctorFactory, UserFactory


# ─── helpers ─────────────────────────────────────────────────────────────────

def _make_payment_with_receipt(practice=None) -> Payment:
    """Create a PENDING TRANSFER payment with a fake receipt file."""
    if practice is None:
        practice = PracticeFactory()
    tutor = UserFactory()
    patient = PatientFactory(practice=practice)
    TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
    appointment = AppointmentFactory(
        practice=practice,
        patient=patient,
        status=Payment.PENDING,
    )
    payment = PaymentFactory(
        practice=practice,
        patient=patient,
        appointment=appointment,
        paid_by=tutor,
        payment_method=Payment.TRANSFER,
        status=Payment.PENDING,
        amount=Decimal("35000"),
    )
    # Attach a fake receipt file
    payment.receipt_file.save(
        "receipt.jpg",
        ContentFile(b"fake image bytes"),
        save=True,
    )
    return payment


def _gemini_mock(json_text: str):
    """Return a mock for google.generativeai that yields the given text response."""
    mock_response = MagicMock()
    mock_response.text = json_text

    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response

    mock_genai = MagicMock()
    mock_genai.GenerativeModel.return_value = mock_model
    return mock_genai


# ─── T-19: OCR service unit tests ────────────────────────────────────────────

@pytest.mark.django_db
class TestAnalyzeReceiptWithGemini:
    def test_stores_ocr_result_in_metadata(self, settings):
        """Mocked Gemini response → ocr_result stored in payment.metadata."""
        settings.GEMINI_API_KEY = "test-key-abc"

        payment = _make_payment_with_receipt()

        gemini_json = json.dumps({
            "monto": 35000,
            "fecha": payment.created_at.date().isoformat(),
            "rut_remitente": "11.111.111-3",
            "banco_origen": "Banco Santander",
        })

        mock_genai = _gemini_mock(gemini_json)

        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import import_module, reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            result = ocr_mod.analyze_receipt_with_gemini(payment.id)

        payment.refresh_from_db()
        assert result is not None
        assert "ocr_result" in payment.metadata
        ocr = payment.metadata["ocr_result"]
        assert ocr["extracted"]["monto"] == 35000
        assert ocr["extracted"]["rut_remitente"] == "11.111.111-3"
        assert ocr["extracted"]["banco_origen"] == "Banco Santander"
        assert "analyzed_at" in ocr

    def test_stores_confidence_as_integer_percentage(self, settings):
        """confidence field is an integer between 0 and 100."""
        settings.GEMINI_API_KEY = "test-key-abc"

        payment = _make_payment_with_receipt()

        gemini_json = json.dumps({
            "monto": 35000,
            "fecha": payment.created_at.date().isoformat(),
            "rut_remitente": "11.111.111-3",
            "banco_origen": "Banco Santander",
        })

        mock_genai = _gemini_mock(gemini_json)
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            result = ocr_mod.analyze_receipt_with_gemini(payment.id)

        payment.refresh_from_db()
        assert result is not None
        confidence = payment.metadata["ocr_result"]["confidence"]
        assert isinstance(confidence, int)
        assert 0 <= confidence <= 100

    def test_returns_none_when_api_key_not_set(self, settings):
        """No API key → returns None, does NOT store error, does NOT crash."""
        settings.GEMINI_API_KEY = ""

        payment = _make_payment_with_receipt()

        from apps.billing.services.ocr_service import analyze_receipt_with_gemini

        result = analyze_receipt_with_gemini(payment.id)

        assert result is None
        payment.refresh_from_db()
        # metadata should NOT have ocr_result when key is missing
        assert "ocr_result" not in (payment.metadata or {})

    def test_handles_invalid_json_gracefully(self, settings):
        """Gemini returns garbage text → stores error marker, returns None."""
        settings.GEMINI_API_KEY = "test-key-abc"

        payment = _make_payment_with_receipt()

        mock_genai = _gemini_mock("this is NOT json at all!")
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            result = ocr_mod.analyze_receipt_with_gemini(payment.id)

        assert result is None
        payment.refresh_from_db()
        # Should store an error marker so the dashboard can react
        assert "ocr_result" in payment.metadata
        assert "error" in payment.metadata["ocr_result"]

    def test_handles_gemini_api_exception_gracefully(self, settings):
        """Gemini raises an exception → stores error, returns None, no crash."""
        settings.GEMINI_API_KEY = "test-key-abc"

        payment = _make_payment_with_receipt()

        mock_genai = MagicMock()
        mock_genai.GenerativeModel.side_effect = RuntimeError("network error")
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            result = ocr_mod.analyze_receipt_with_gemini(payment.id)

        assert result is None
        payment.refresh_from_db()
        assert "ocr_result" in payment.metadata
        assert "error" in payment.metadata["ocr_result"]

    def test_amount_match_true_when_amounts_equal(self, settings):
        """monto extracted == payment.amount → matches.monto is True."""
        settings.GEMINI_API_KEY = "test-key-abc"

        payment = _make_payment_with_receipt()
        payment.amount = Decimal("50000")
        payment.save(update_fields=["amount", "updated_at"])

        gemini_json = json.dumps({
            "monto": 50000,
            "fecha": payment.created_at.date().isoformat(),
            "rut_remitente": None,
            "banco_origen": None,
        })
        mock_genai = _gemini_mock(gemini_json)
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            ocr_mod.analyze_receipt_with_gemini(payment.id)

        payment.refresh_from_db()
        assert payment.metadata["ocr_result"]["matches"]["monto"] is True

    def test_amount_match_false_when_amounts_differ(self, settings):
        """monto extracted != payment.amount → matches.monto is False."""
        settings.GEMINI_API_KEY = "test-key-abc"

        payment = _make_payment_with_receipt()
        payment.amount = Decimal("50000")
        payment.save(update_fields=["amount", "updated_at"])

        gemini_json = json.dumps({
            "monto": 99999,
            "fecha": payment.created_at.date().isoformat(),
            "rut_remitente": None,
            "banco_origen": None,
        })
        mock_genai = _gemini_mock(gemini_json)
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            ocr_mod.analyze_receipt_with_gemini(payment.id)

        payment.refresh_from_db()
        assert payment.metadata["ocr_result"]["matches"]["monto"] is False

    def test_date_match_true_within_3_days(self, settings):
        """fecha within 3 days of payment.created_at → matches.fecha is True."""
        settings.GEMINI_API_KEY = "test-key-abc"

        from datetime import timedelta

        payment = _make_payment_with_receipt()
        # Use a date 2 days in the future of payment.created_at
        close_date = (payment.created_at.date() + timedelta(days=2)).isoformat()

        gemini_json = json.dumps({
            "monto": None,
            "fecha": close_date,
            "rut_remitente": None,
            "banco_origen": None,
        })
        mock_genai = _gemini_mock(gemini_json)
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            ocr_mod.analyze_receipt_with_gemini(payment.id)

        payment.refresh_from_db()
        assert payment.metadata["ocr_result"]["matches"]["fecha"] is True

    def test_date_match_false_outside_3_days(self, settings):
        """fecha more than 3 days from payment.created_at → matches.fecha is False."""
        settings.GEMINI_API_KEY = "test-key-abc"

        from datetime import timedelta

        payment = _make_payment_with_receipt()
        far_date = (payment.created_at.date() - timedelta(days=10)).isoformat()

        gemini_json = json.dumps({
            "monto": None,
            "fecha": far_date,
            "rut_remitente": None,
            "banco_origen": None,
        })
        mock_genai = _gemini_mock(gemini_json)
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            ocr_mod.analyze_receipt_with_gemini(payment.id)

        payment.refresh_from_db()
        assert payment.metadata["ocr_result"]["matches"]["fecha"] is False

    def test_confidence_calculation_all_fields_present_and_match(self, settings):
        """All 4 fields non-null and both verifiable fields match → confidence == 100."""
        settings.GEMINI_API_KEY = "test-key-abc"

        payment = _make_payment_with_receipt()
        payment.amount = Decimal("35000")
        payment.save(update_fields=["amount", "updated_at"])

        gemini_json = json.dumps({
            "monto": 35000,
            "fecha": payment.created_at.date().isoformat(),
            "rut_remitente": "11.111.111-3",
            "banco_origen": "Banco Santander",
        })
        mock_genai = _gemini_mock(gemini_json)
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            from importlib import reload
            import apps.billing.services.ocr_service as ocr_mod
            reload(ocr_mod)
            ocr_mod.analyze_receipt_with_gemini(payment.id)

        payment.refresh_from_db()
        assert payment.metadata["ocr_result"]["confidence"] == 100


# ─── T-19: upload_receipt view enqueues OCR task ──────────────────────────────

@pytest.mark.django_db
class TestUploadReceiptEnqueuesOcrTask:
    def _setup(self):
        practice = PracticeFactory()
        doctor = DoctorFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        from apps.scheduling.models import Appointment as Apt

        appointment = AppointmentFactory(
            practice=practice, patient=patient, status=Apt.PENDING,
        )
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appointment,
            paid_by=tutor,
            payment_method=Payment.TRANSFER,
            status=Payment.PENDING,
        )
        client = APIClient()
        client.force_authenticate(user=tutor)
        return client, payment

    def test_upload_receipt_enqueues_ocr_async_task(self):
        """After successful receipt upload, async_task is called with the OCR task path."""
        client, payment = self._setup()

        pdf_content = b"%PDF-1.4 fake" + b"x" * 100
        receipt = SimpleUploadedFile("receipt.pdf", pdf_content, content_type="application/pdf")

        with patch("django_q.tasks.async_task") as mock_async:
            response = client.post(
                f"/api/v1/payments/{payment.id}/upload-receipt/",
                {"receipt": receipt},
                format="multipart",
            )

        assert response.status_code == http_status.HTTP_200_OK
        mock_async.assert_called_once_with(
            "apps.billing.services.ocr_service.analyze_receipt_with_gemini",
            payment.id,
        )

    def test_upload_receipt_succeeds_even_when_ocr_task_enqueue_fails(self):
        """OCR task enqueue failure must NOT cause the upload to fail (fire-and-forget)."""
        client, payment = self._setup()

        pdf_content = b"%PDF-1.4 fake" + b"x" * 100
        receipt = SimpleUploadedFile("receipt.pdf", pdf_content, content_type="application/pdf")

        with patch("django_q.tasks.async_task", side_effect=RuntimeError("Q cluster down")):
            response = client.post(
                f"/api/v1/payments/{payment.id}/upload-receipt/",
                {"receipt": receipt},
                format="multipart",
            )

        # Upload still succeeds despite the enqueue failure
        assert response.status_code == http_status.HTTP_200_OK
        assert response.data["status"] == "pending"
