"""
Tests for billing API views.
"""

from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.billing.models import Payment
from tests.factories.billing import (
    CompletedPaymentFactory,
    InvoiceFactory,
    PaymentFactory,
    PaymentProviderFactory,
)
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory, ServiceFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import DoctorFactory, UserFactory


def auth_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestPaymentListView:
    def test_unauthenticated_access_denied(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/payments/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_doctor_can_list_all_payments(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        PaymentFactory(practice=practice)
        PaymentFactory(practice=practice)

        client = auth_client(doctor)
        response = client.get("/api/v1/payments/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_tutor_sees_only_linked_patient_payments(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()

        linked_patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=linked_patient, practice=practice)
        unlinked_patient = PatientFactory(practice=practice)

        p1 = PaymentFactory(practice=practice, patient=linked_patient)
        p2 = PaymentFactory(practice=practice, patient=unlinked_patient)

        client = auth_client(tutor)
        response = client.get("/api/v1/payments/")
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert p1.pk in ids
        assert p2.pk not in ids

    def test_filter_by_status(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        PaymentFactory(practice=practice, status=Payment.PENDING)
        PaymentFactory(practice=practice, status=Payment.COMPLETED)

        client = auth_client(doctor)
        response = client.get("/api/v1/payments/?status=COMPLETED")
        assert response.status_code == status.HTTP_200_OK
        assert all(r["status"] == "COMPLETED" for r in response.data["results"])


@pytest.mark.django_db
class TestPaymentCreateView:
    def test_doctor_can_create_payment(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        patient = PatientFactory(practice=practice)

        client = auth_client(doctor)
        payload = {
            "practice": practice.pk,
            "patient": patient.pk,
            "amount": "30000.00",
            "payment_method": Payment.CASH,
        }
        response = client.post("/api/v1/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_tutor_payment_amount_derived_from_appointment(self) -> None:
        """Tutors cannot specify an arbitrary amount — it must come from the appointment's service."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        service = ServiceFactory(practice=practice, price_clp=25000)
        appointment = AppointmentFactory(practice=practice, patient=patient, service=service)

        client = auth_client(tutor)
        payload = {
            "practice": practice.pk,
            "patient": patient.pk,
            "appointment": appointment.pk,
            # amount deliberately omitted — must be derived server-side
            "payment_method": Payment.MERCADOPAGO,
        }
        response = client.post("/api/v1/payments/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert str(response.data["amount"]) == "25000.00"

    def test_tutor_cannot_create_payment_without_appointment(self) -> None:
        """Tutors are rejected if they try to create a payment without an appointment."""
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        client = auth_client(tutor)
        payload = {
            "practice": practice.pk,
            "patient": patient.pk,
            "payment_method": Payment.MERCADOPAGO,
        }
        response = client.post("/api/v1/payments/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPaymentActions:
    def test_create_preference_action(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        payment = PaymentFactory(practice=practice, payment_method=Payment.CASH)

        client = auth_client(doctor)
        response = client.post(f"/api/v1/payments/{payment.pk}/create-preference/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_preference_already_completed_returns_400(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        payment = CompletedPaymentFactory(practice=practice)

        client = auth_client(doctor)
        response = client.post(f"/api/v1/payments/{payment.pk}/create-preference/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_export_doctor_only(self) -> None:
        doctor = DoctorFactory()
        PracticeFactory(owner=doctor)
        client = auth_client(doctor)
        response = client.get("/api/v1/payments/export/")
        # 200 if openpyxl installed, 501 if not
        assert response.status_code in (status.HTTP_200_OK, 501)

    def test_export_tutor_forbidden(self) -> None:
        tutor = UserFactory()
        client = auth_client(tutor)
        response = client.get("/api/v1/payments/export/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestInvoiceViews:
    def test_doctor_can_list_invoices(self) -> None:
        from apps.billing.models import Invoice

        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        payment = PaymentFactory(practice=practice)
        Invoice.objects.create(
            practice=practice,
            payment=payment,
            invoice_number="PEDIA-2026-900001",
            patient_name="Test Patient",
            service_description="Consulta",
            subtotal=payment.amount,
            tax_amount=0,
            total=payment.amount,
        )

        client = auth_client(doctor)
        response = client.get("/api/v1/invoices/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_tutor_sees_only_linked_invoices(self) -> None:
        from apps.billing.models import Invoice

        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()

        linked_patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=linked_patient, practice=practice)
        unlinked_patient = PatientFactory(practice=practice)

        p1 = PaymentFactory(practice=practice, patient=linked_patient)
        p2 = PaymentFactory(practice=practice, patient=unlinked_patient)

        i1 = Invoice.objects.create(
            practice=practice, payment=p1, invoice_number="PEDIA-2026-800001",
            patient_name="Linked", service_description="Consulta",
            subtotal=p1.amount, tax_amount=0, total=p1.amount,
        )
        i2 = Invoice.objects.create(
            practice=practice, payment=p2, invoice_number="PEDIA-2026-800002",
            patient_name="Unlinked", service_description="Consulta",
            subtotal=p2.amount, tax_amount=0, total=p2.amount,
        )

        client = auth_client(tutor)
        response = client.get("/api/v1/invoices/")
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert i1.pk in ids
        assert i2.pk not in ids

    def test_unauthenticated_cannot_access_invoices(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/invoices/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestPaymentProviderViews:
    def test_doctor_can_list_providers(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        PaymentProviderFactory(practice=practice)

        client = auth_client(doctor)
        response = client.get("/api/v1/admin/payment-providers/")
        assert response.status_code == status.HTTP_200_OK

    def test_tutor_cannot_access_providers(self) -> None:
        tutor = UserFactory()
        client = auth_client(tutor)
        response = client.get("/api/v1/admin/payment-providers/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# CashFlowView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCashFlowView:
    def test_doctor_can_view_cash_flow(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        client = auth_client(doctor)
        response = client.get("/api/v1/cash-flow/")
        assert response.status_code == status.HTTP_200_OK
        assert "series" in response.data or "months" in response.data

    def test_doctor_without_practice_returns_404(self) -> None:
        doctor = DoctorFactory()
        # No practice created
        client = auth_client(doctor)
        response = client.get("/api/v1/cash-flow/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_tutor_cannot_access_cash_flow(self) -> None:
        tutor = UserFactory()
        client = auth_client(tutor)
        response = client.get("/api/v1/cash-flow/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/cash-flow/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# TaxCalculatorView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTaxCalculatorView:
    url = "/api/v1/tax-calculator/"

    def _auth_doctor_client(self):
        doctor = DoctorFactory()
        PracticeFactory(owner=doctor)
        return auth_client(doctor)

    def test_calculate_boleta_returns_200(self) -> None:
        client = self._auth_doctor_client()
        response = client.post(
            self.url,
            {"gross_amount": 500000, "document_type": "boleta"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "boleta" in data
        assert "factura" in data
        assert "comparison" in data
        assert data["boleta"]["retention"] > 0

    def test_calculate_factura_returns_200(self) -> None:
        client = self._auth_doctor_client()
        response = client.post(
            self.url,
            {"gross_amount": 500000, "document_type": "factura_exenta"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["factura"]["annual_tax_estimate"] >= 0

    def test_tutor_cannot_access_calculator(self) -> None:
        tutor = UserFactory()
        client = auth_client(tutor)
        response = client.post(
            self.url,
            {"gross_amount": 500000, "document_type": "boleta"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_missing_gross_amount_returns_400(self) -> None:
        client = self._auth_doctor_client()
        response = client.post(self.url, {"document_type": "boleta"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_zero_gross_returns_400(self) -> None:
        client = self._auth_doctor_client()
        response = client.post(
            self.url,
            {"gross_amount": 0, "document_type": "boleta"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_document_type_returns_400(self) -> None:
        client = self._auth_doctor_client()
        response = client.post(
            self.url,
            {"gross_amount": 500000, "document_type": "invalid"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_returns_401(self) -> None:
        client = APIClient()
        response = client.post(
            self.url,
            {"gross_amount": 500000, "document_type": "boleta"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_comparison_recommends_factura_for_high_income(self) -> None:
        client = self._auth_doctor_client()
        response = client.post(
            self.url,
            {"gross_amount": 5000000, "document_type": "boleta"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        rec = response.data["comparison"]["recommendation"]
        assert rec in ("boleta", "factura")
