from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.practice.models import WorkingHours
from apps.scheduling.models import Appointment, WaitlistEntry
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory, WorkingHoursFactory
from tests.factories.scheduling import (
    AppointmentFactory,
    AutoResponderConfigFactory,
    CancellationPolicyFactory,
    CancellationTierFactory,
    WaitlistEntryFactory,
)
from tests.factories.users import DoctorFactory, UserFactory


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def doctor_client():
    client = APIClient()
    doctor = DoctorFactory()
    client.force_authenticate(user=doctor)
    return client, doctor


@pytest.fixture
def tutor_client():
    client = APIClient()
    tutor = UserFactory()
    client.force_authenticate(user=tutor)
    return client, tutor


# ---------------------------------------------------------------------------
# Appointment endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAppointmentListCreate:
    def test_doctor_can_list_all_appointments(self, doctor_client):
        client, doctor = doctor_client
        AppointmentFactory()
        AppointmentFactory()
        url = reverse("scheduling:appointment-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_tutor_sees_only_linked_patients(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        patient_mine = PatientFactory(practice=practice)
        patient_other = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient_mine, practice=practice)
        appt_mine = AppointmentFactory(practice=practice, patient=patient_mine)
        appt_other = AppointmentFactory(practice=practice, patient=patient_other)

        url = reverse("scheduling:appointment-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert appt_mine.id in ids
        assert appt_other.id not in ids

    def test_anon_cannot_list_appointments(self, api_client):
        url = reverse("scheduling:appointment-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_doctor_can_create_appointment(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        patient = PatientFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        location = LocationFactory(practice=practice)
        url = reverse("scheduling:appointment-list")
        payload = {
            "practice": practice.id,
            "patient": patient.id,
            "service": service.id,
            "location": location.id,
            "doctor": doctor.id,
            "scheduled_date": "2026-07-01",
            "start_time": "09:00:00",
            "is_online": False,
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == Appointment.PENDING

    def test_tutor_can_create_appointment_for_linked_patient(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        location = LocationFactory(practice=practice)
        doctor = DoctorFactory()
        url = reverse("scheduling:appointment-list")
        payload = {
            "practice": practice.id,
            "patient": patient.id,
            "service": service.id,
            "location": location.id,
            "doctor": doctor.id,
            "scheduled_date": "2026-07-01",
            "start_time": "09:00:00",
            "is_online": False,
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_tutor_cannot_create_appointment_for_unlinked_patient(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)  # NOT linked to tutor
        service = ServiceFactory(practice=practice, duration_minutes=30)
        location = LocationFactory(practice=practice)
        doctor = DoctorFactory()
        url = reverse("scheduling:appointment-list")
        payload = {
            "practice": practice.id,
            "patient": patient.id,
            "service": service.id,
            "location": location.id,
            "doctor": doctor.id,
            "scheduled_date": "2026-07-01",
            "start_time": "09:00:00",
            "is_online": False,
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_appointments_by_date(self, doctor_client):
        client, _ = doctor_client
        appt1 = AppointmentFactory(scheduled_date=datetime.date(2026, 7, 1))
        appt2 = AppointmentFactory(scheduled_date=datetime.date(2026, 7, 2))
        url = reverse("scheduling:appointment-list") + "?date=2026-07-01"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert appt1.id in ids
        assert appt2.id not in ids

    def test_filter_appointments_by_status(self, doctor_client):
        client, _ = doctor_client
        pending = AppointmentFactory(status=Appointment.PENDING)
        confirmed = AppointmentFactory(status=Appointment.CONFIRMED)
        url = reverse("scheduling:appointment-list") + "?status=CONFIRMED"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert confirmed.id in ids
        assert pending.id not in ids

    def test_filter_appointments_by_patient_id(self, doctor_client):
        client, _ = doctor_client
        appt1 = AppointmentFactory()
        appt2 = AppointmentFactory()
        url = reverse("scheduling:appointment-list") + f"?patient_id={appt1.patient.id}"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert appt1.id in ids
        assert appt2.id not in ids


@pytest.mark.django_db
class TestAppointmentDetail:
    def test_doctor_can_retrieve_appointment(self, doctor_client):
        client, _ = doctor_client
        appt = AppointmentFactory()
        url = reverse("scheduling:appointment-detail", kwargs={"pk": appt.pk})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == appt.id

    def test_doctor_can_update_appointment(self, doctor_client):
        client, _ = doctor_client
        appt = AppointmentFactory(status=Appointment.PENDING)
        url = reverse("scheduling:appointment-detail", kwargs={"pk": appt.pk})
        response = client.patch(url, data={"notes": "Updated notes"}, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_tutor_cannot_update_appointment(self, tutor_client):
        client, _ = tutor_client
        appt = AppointmentFactory()
        url = reverse("scheduling:appointment-detail", kwargs={"pk": appt.pk})
        response = client.patch(url, data={"notes": "hack"}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAppointmentCancelAction:
    def test_doctor_can_cancel_appointment(self, doctor_client):
        client, _ = doctor_client
        appt = AppointmentFactory(status=Appointment.PENDING)
        url = reverse("scheduling:appointment-cancel", kwargs={"pk": appt.pk})
        response = client.post(url, data={"reason": "Patient request"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        appt.refresh_from_db()
        assert appt.status == Appointment.CANCELLED

    def test_tutor_can_cancel_linked_patient_appointment(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appt = AppointmentFactory(practice=practice, patient=patient, status=Appointment.PENDING)
        url = reverse("scheduling:appointment-cancel", kwargs={"pk": appt.pk})
        response = client.post(url, data={"reason": "Cannot attend"}, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_tutor_cannot_cancel_unlinked_patient_appointment(self, tutor_client):
        client, tutor = tutor_client
        appt = AppointmentFactory(status=Appointment.PENDING)  # not linked to tutor
        url = reverse("scheduling:appointment-cancel", kwargs={"pk": appt.pk})
        response = client.post(url, data={}, format="json")
        # tutor cannot see unlinked patient appointments → 404
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)

    def test_cancel_already_cancelled_returns_400(self, doctor_client):
        client, _ = doctor_client
        appt = AppointmentFactory(status=Appointment.CANCELLED)
        url = reverse("scheduling:appointment-cancel", kwargs={"pk": appt.pk})
        response = client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancel_returns_penalty_info(self, doctor_client):
        client, _ = doctor_client
        appt = AppointmentFactory(status=Appointment.PENDING)
        url = reverse("scheduling:appointment-cancel", kwargs={"pk": appt.pk})
        response = client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "penalty_info" in response.data


@pytest.mark.django_db
class TestAppointmentConfirmAction:
    def test_doctor_can_confirm_appointment(self, doctor_client):
        client, _ = doctor_client
        appt = AppointmentFactory(status=Appointment.PENDING)
        url = reverse("scheduling:appointment-confirm", kwargs={"pk": appt.pk})
        response = client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_200_OK
        appt.refresh_from_db()
        assert appt.status == Appointment.CONFIRMED
        assert appt.confirmed_at is not None

    def test_tutor_cannot_confirm_appointment(self, tutor_client):
        client, _ = tutor_client
        appt = AppointmentFactory(status=Appointment.PENDING)
        url = reverse("scheduling:appointment-confirm", kwargs={"pk": appt.pk})
        response = client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_confirm_non_pending_returns_400(self, doctor_client):
        client, _ = doctor_client
        appt = AppointmentFactory(status=Appointment.COMPLETED)
        url = reverse("scheduling:appointment-confirm", kwargs={"pk": appt.pk})
        response = client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Available slots endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailableSlotsView:
    def test_public_access_no_auth_required(self, api_client):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=WorkingHours.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(10, 0),
        )
        url = reverse("scheduling:available-slots") + f"?location={location.id}&service={service.id}&date=2026-06-01"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_returns_slots(self, api_client):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=WorkingHours.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(10, 0),
        )
        url = reverse("scheduling:available-slots") + f"?location={location.id}&service={service.id}&date=2026-06-01"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_missing_params_returns_400(self, api_client):
        url = reverse("scheduling:available-slots")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_date_returns_400(self, api_client):
        url = reverse("scheduling:available-slots") + "?location=1&service=1&date=not-a-date"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Waitlist endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestWaitlistViewSet:
    def test_doctor_can_list_all_waitlist(self, doctor_client):
        client, _ = doctor_client
        WaitlistEntryFactory()
        WaitlistEntryFactory()
        url = reverse("scheduling:waitlist-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_tutor_sees_only_own_waitlist(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        patient_mine = PatientFactory(practice=practice)
        patient_other = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient_mine, practice=practice)
        entry_mine = WaitlistEntryFactory(practice=practice, patient=patient_mine)
        entry_other = WaitlistEntryFactory(practice=practice, patient=patient_other)

        url = reverse("scheduling:waitlist-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert entry_mine.id in ids
        assert entry_other.id not in ids

    def test_tutor_can_create_waitlist_for_linked_patient(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        service = ServiceFactory(practice=practice)
        url = reverse("scheduling:waitlist-list")
        payload = {
            "practice": practice.id,
            "patient": patient.id,
            "service": service.id,
            "preferred_date_start": "2026-08-01",
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_tutor_cannot_create_waitlist_for_unlinked_patient(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)  # NOT linked
        service = ServiceFactory(practice=practice)
        url = reverse("scheduling:waitlist-list")
        payload = {
            "practice": practice.id,
            "patient": patient.id,
            "service": service.id,
            "preferred_date_start": "2026-08-01",
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_doctor_can_delete_waitlist_entry(self, doctor_client):
        client, _ = doctor_client
        entry = WaitlistEntryFactory()
        url = reverse("scheduling:waitlist-detail", kwargs={"pk": entry.pk})
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_anon_cannot_access_waitlist(self, api_client):
        url = reverse("scheduling:waitlist-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCancellationPolicyView:
    def test_doctor_can_get_policy(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        CancellationPolicyFactory(practice=practice)
        url = reverse("scheduling:admin-cancellation-policy")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_doctor_can_update_policy(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        CancellationPolicyFactory(practice=practice)
        url = reverse("scheduling:admin-cancellation-policy")
        payload = {
            "practice": practice.id,
            "is_active": True,
            "description": "Updated policy",
        }
        response = client.put(url, data=payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Updated policy"

    def test_tutor_cannot_access_policy(self, tutor_client):
        client, _ = tutor_client
        url = reverse("scheduling:admin-cancellation-policy")
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCancellationTierViewSet:
    def test_doctor_can_list_tiers(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        policy = CancellationPolicyFactory(practice=practice)
        CancellationTierFactory(policy=policy, min_hours_before=48, penalty_percentage="0.00", description="Free")
        url = reverse("scheduling:admin-cancellation-tiers-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_tutor_cannot_access_tiers(self, tutor_client):
        client, _ = tutor_client
        url = reverse("scheduling:admin-cancellation-tiers-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAutoResponderConfigView:
    def test_doctor_can_get_config(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        AutoResponderConfigFactory(practice=practice)
        url = reverse("scheduling:admin-auto-responder")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_doctor_can_update_config(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        AutoResponderConfigFactory(practice=practice)
        url = reverse("scheduling:admin-auto-responder")
        payload = {
            "practice": practice.id,
            "is_active": True,
            "outside_hours_message": "We are closed right now.",
            "holiday_message": "Happy holidays!",
        }
        response = client.put(url, data=payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["outside_hours_message"] == "We are closed right now."

    def test_tutor_cannot_access_auto_responder(self, tutor_client):
        client, _ = tutor_client
        url = reverse("scheduling:admin-auto-responder")
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
