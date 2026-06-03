"""
TDD integration tests for BookingView (Phase 2).

RED → GREEN cycle:
  - Tests written first (RED), view implementation follows.
  - MercadoPago SDK is always mocked — no real network calls.
"""

from __future__ import annotations

import datetime
from unittest.mock import MagicMock, patch

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
# Helpers
# ---------------------------------------------------------------------------

MP_INIT_POINT = "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=test-view-123"
MP_PREFERENCE_ID = "test-view-123"


def mp_strategy_mock():
    """Patch MercadoPago so no real HTTP calls are made during view tests."""
    return patch(
        "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
        return_value={"init_point": MP_INIT_POINT, "preference_id": MP_PREFERENCE_ID},
    )


# ---------------------------------------------------------------------------
# 2.4 Happy path — presential booking returns 201
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookPresential201:
    def test_book_presential_201(self):
        """
        RED → GREEN: authenticated TUTOR can book a presential slot.
        Response: 201 with appointment_id, payment_id, checkout_url, hold_expires_at.
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

        with mp_strategy_mock():
            response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert "appointment_id" in data
        assert "payment_id" in data
        assert "checkout_url" in data
        assert "hold_expires_at" in data
        assert data["checkout_url"] == MP_INIT_POINT

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
        RED → GREEN: TUTOR can book an online service without providing location_id.
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

        with mp_strategy_mock():
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

        # Create a blocking appointment
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
        with mp_strategy_mock():
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
        """
        RED → GREEN: DOCTOR can confirm an appointment in HOLD status.
        Previously confirm() only accepted PENDING.
        """
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
# T-01: preference_id in BookingView response
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBookingResponsePreferenceId:
    def test_booking_response_includes_preference_id(self):
        """
        RED → GREEN: BookingView response must include a non-null preference_id string
        when payment method is MERCADOPAGO.
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
            "scheduled_date": "2026-09-01",
            "start_time": "09:00",
            "is_online": False,
        }

        with mp_strategy_mock():
            response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert "preference_id" in data
        assert data["preference_id"] is not None
        assert isinstance(data["preference_id"], str)
        assert len(data["preference_id"]) > 0

    def test_booking_response_preference_id_matches_mp_strategy_result(self):
        """
        RED → GREEN: preference_id in the response must match the value returned
        by MercadoPagoStrategy.create_preference() (i.e., MP_PREFERENCE_ID from the mock).
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
            "scheduled_date": "2026-09-02",
            "start_time": "10:00",
            "is_online": False,
        }

        with mp_strategy_mock():
            response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        # preference_id in response must exactly match what the MP strategy returned
        assert data["preference_id"] == MP_PREFERENCE_ID

    def test_booking_response_still_includes_checkout_url(self):
        """
        Backward compatibility: checkout_url must still be present in the response.
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
            "scheduled_date": "2026-09-03",
            "start_time": "11:00",
            "is_online": False,
        }

        with mp_strategy_mock():
            response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "checkout_url" in response.data
