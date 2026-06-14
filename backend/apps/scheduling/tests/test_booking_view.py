"""
TDD integration tests for BookingView (Phase 2).

RED → GREEN cycle:
  - Tests written first (RED), view implementation follows.
  - hold_appointment() creates Appointment + Payment atomically.
  - Payment is collected later via the CardPayment Brick (process-card endpoint).
"""

from __future__ import annotations

import datetime

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.billing.models import Payment
from apps.scheduling.models import Appointment
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory
from tests.factories.users import DoctorFactory, UserFactory, VisitorFactory


# ---------------------------------------------------------------------------
# 2.4 Happy path — presential booking returns 201
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookPresential201:
    def test_book_presential_201(self):
        """
        Authenticated TUTOR can book a presential slot.
        Response: 201 with appointment_id, payment_id, hold_expires_at.
        """
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, price_clp=20000, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        client = APIClient()
        client.force_authenticate(user=tutor)

        url = reverse("scheduling:book")
        payload = {
            "practice": practice.pk,
            "service": service.pk,
            "location": location.pk,
            "patient": patient.pk,
            "scheduled_date": "2026-08-01",
            "start_time": "09:00",
            "is_online": False,
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert "appointment_id" in data
        assert "payment_id" in data
        assert "hold_expires_at" in data
        assert "payment_method" in data

        # Verify DB state
        appointment = Appointment.objects.get(pk=data["appointment_id"])
        assert appointment.status == Appointment.HOLD
        assert appointment.patient == patient

        payment = Payment.objects.get(pk=data["payment_id"])
        assert payment.status == Payment.PENDING
        assert payment.payment_method == Payment.MERCADOPAGO


# ---------------------------------------------------------------------------
# 2.5 Online booking — no location required
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookOnlineNoLocation201:
    def test_book_online_no_location_201(self):
        """
        TUTOR can book an online service without providing location_id.
        Response: 201.
        """
        from apps.practice.models import Service as ServiceModel

        practice = PracticeFactory()
        service = ServiceFactory(
            practice=practice,
            duration_minutes=30,
            price_clp=15000,
            is_active=True,
            modality=ServiceModel.ONLINE,
        )
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        client = APIClient()
        client.force_authenticate(user=tutor)

        url = reverse("scheduling:book")
        payload = {
            "practice": practice.pk,
            "service": service.pk,
            "patient": patient.pk,
            "scheduled_date": "2026-08-02",
            "start_time": "10:00",
            "is_online": True,
        }

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert "appointment_id" in data

        appointment = Appointment.objects.get(pk=data["appointment_id"])
        assert appointment.is_online is True
        assert appointment.location is None


# ---------------------------------------------------------------------------
# 2.6 Authentication and permission checks
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookPermissions:
    def test_book_unauthenticated_401(self):
        """Unauthenticated request must receive HTTP 401."""
        client = APIClient()
        url = reverse("scheduling:book")
        response = client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_book_non_tutor_403(self):
        """DOCTOR role must receive HTTP 403 — only TUTORs can book via this endpoint."""
        doctor = DoctorFactory()
        client = APIClient()
        client.force_authenticate(user=doctor)

        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)
        patient = PatientFactory(practice=practice)

        url = reverse("scheduling:book")
        payload = {
            "practice": practice.pk,
            "service": service.pk,
            "location": location.pk,
            "patient": patient.pk,
            "scheduled_date": "2026-08-03",
            "start_time": "09:00",
            "is_online": False,
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_book_visitor_403(self):
        """VISITOR role must receive HTTP 403."""
        visitor = VisitorFactory()
        client = APIClient()
        client.force_authenticate(user=visitor)

        url = reverse("scheduling:book")
        response = client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_book_patient_not_owned_403(self):
        """Tutor trying to book for another tutor's patient must receive HTTP 403."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)
        tutor = UserFactory()
        other_tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=other_tutor, patient=patient, practice=practice)

        client = APIClient()
        client.force_authenticate(user=tutor)

        url = reverse("scheduling:book")
        payload = {
            "practice": practice.pk,
            "service": service.pk,
            "location": location.pk,
            "patient": patient.pk,
            "scheduled_date": "2026-08-04",
            "start_time": "09:00",
            "is_online": False,
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_book_slot_taken_409(self):
        """Booking a slot already taken must return HTTP 409."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        from tests.factories.scheduling import AppointmentFactory

        AppointmentFactory(
            practice=practice,
            location=location,
            service=service,
            scheduled_date=datetime.date(2026, 8, 5),
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
            status=Appointment.HOLD,
        )

        client = APIClient()
        client.force_authenticate(user=tutor)

        url = reverse("scheduling:book")
        payload = {
            "practice": practice.pk,
            "service": service.pk,
            "location": location.pk,
            "patient": patient.pk,
            "scheduled_date": "2026-08-05",
            "start_time": "09:00",
            "is_online": False,
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_book_inactive_service_400(self):
        """Booking with inactive service must return HTTP 400."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=False)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        client = APIClient()
        client.force_authenticate(user=tutor)

        url = reverse("scheduling:book")
        payload = {
            "practice": practice.pk,
            "service": service.pk,
            "location": location.pk,
            "patient": patient.pk,
            "scheduled_date": "2026-08-06",
            "start_time": "09:00",
            "is_online": False,
        }
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# 2.9 Confirm action accepts HOLD status
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestConfirmActionAcceptsHold:
    def test_doctor_can_confirm_hold_appointment(self):
        """DOCTOR can confirm an appointment in HOLD status."""
        from tests.factories.scheduling import AppointmentFactory

        doctor = DoctorFactory()
        client = APIClient()
        client.force_authenticate(user=doctor)

        appointment = AppointmentFactory(status=Appointment.HOLD)

        url = reverse("scheduling:appointment-confirm", kwargs={"pk": appointment.pk})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        appointment.refresh_from_db()
        assert appointment.status == Appointment.CONFIRMED

    def test_doctor_can_still_confirm_pending_appointment(self):
        """Existing behaviour: DOCTOR can confirm PENDING appointment (regression test)."""
        from tests.factories.scheduling import AppointmentFactory

        doctor = DoctorFactory()
        client = APIClient()
        client.force_authenticate(user=doctor)

        appointment = AppointmentFactory(status=Appointment.PENDING)

        url = reverse("scheduling:appointment-confirm", kwargs={"pk": appointment.pk})
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        appointment.refresh_from_db()
        assert appointment.status == Appointment.CONFIRMED

    def test_tutor_cannot_confirm_appointment(self):
        """TUTOR must receive 403 on the confirm action."""
        from tests.factories.scheduling import AppointmentFactory

        tutor = UserFactory()
        client = APIClient()
        client.force_authenticate(user=tutor)

        appointment = AppointmentFactory(status=Appointment.HOLD)

        url = reverse("scheduling:appointment-confirm", kwargs={"pk": appointment.pk})
        response = client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# T-08: TRANSFER payment_method in BookingView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingViewTransferPaymentMethod:
    def _setup(self):
        practice = PracticeFactory(
            bank_name="Banco prepago Tenpo",
            account_type="Cuenta Vista",
            account_number="111128625096",
            account_holder="ESTEFANIA ORTIGOSA",
            account_rut="28625096-3",
            account_email="",
        )
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, price_clp=35000, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        return practice, location, service, tutor, patient

    def _payload(self, practice, location, service, patient, date_str, time_str):
        return {
            "practice": practice.pk,
            "service": service.pk,
            "location": location.pk,
            "patient": patient.pk,
            "scheduled_date": date_str,
            "start_time": time_str,
            "is_online": False,
        }

    def test_booking_view_transfer_response_contains_bank_details(self):
        """POST with payment_method=TRANSFER returns bank_details dict with 6 keys."""
        practice, location, service, tutor, patient = self._setup()
        client = APIClient()
        client.force_authenticate(user=tutor)

        payload = self._payload(practice, location, service, patient, "2026-10-01", "09:00")
        payload["payment_method"] = "TRANSFER"

        response = client.post(reverse("scheduling:book"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "bank_details" in data
        bd = data["bank_details"]
        for key in ("bank_name", "account_type", "account_number", "account_holder", "account_rut", "account_email"):
            assert key in bd, f"Missing bank_details key: {key}"
        assert bd["bank_name"] == "Banco prepago Tenpo"
        assert bd["account_number"] == "111128625096"

    def test_booking_view_transfer_response_has_transfer_expires_at(self):
        """TRANSFER response includes transfer_expires_at."""
        practice, location, service, tutor, patient = self._setup()
        client = APIClient()
        client.force_authenticate(user=tutor)

        payload = self._payload(practice, location, service, patient, "2026-10-03", "09:00")
        payload["payment_method"] = "TRANSFER"

        response = client.post(reverse("scheduling:book"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "transfer_expires_at" in data
        assert data["transfer_expires_at"] is not None

    def test_booking_view_mercadopago_response_no_bank_details(self):
        """MERCADOPAGO response must NOT contain bank_details."""
        practice, location, service, tutor, patient = self._setup()
        client = APIClient()
        client.force_authenticate(user=tutor)

        payload = self._payload(practice, location, service, patient, "2026-10-04", "09:00")
        payload["payment_method"] = "MERCADOPAGO"

        response = client.post(reverse("scheduling:book"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "bank_details" not in response.json()

    def test_booking_view_default_payment_method_is_mercadopago(self):
        """Omitting payment_method from request defaults to MERCADOPAGO flow."""
        practice, location, service, tutor, patient = self._setup()
        client = APIClient()
        client.force_authenticate(user=tutor)

        payload = self._payload(practice, location, service, patient, "2026-10-05", "09:00")

        response = client.post(reverse("scheduling:book"), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["payment_method"] == "MERCADOPAGO"
        assert "hold_expires_at" in data

    def test_booking_view_invalid_payment_method_returns_400(self):
        """Posting an invalid payment_method value returns 400."""
        practice, location, service, tutor, patient = self._setup()
        client = APIClient()
        client.force_authenticate(user=tutor)

        payload = self._payload(practice, location, service, patient, "2026-10-06", "09:00")
        payload["payment_method"] = "BITCOIN"

        response = client.post(reverse("scheduling:book"), payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
