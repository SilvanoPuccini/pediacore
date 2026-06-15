"""
Integration tests for public token views and confirm-attendance action.

TDD — tests written BEFORE production code for Batch 2.
"""
from __future__ import annotations

import datetime
import uuid
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time
from rest_framework import status
from rest_framework.test import APIClient

from apps.scheduling.models import Appointment, AppointmentToken
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory
from tests.factories.scheduling import AppointmentFactory, AppointmentTokenFactory
from tests.factories.users import DoctorFactory, UserFactory


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def confirmed_appointment():
    """An appointment in CONFIRMED status."""
    return AppointmentFactory(status=Appointment.CONFIRMED)


@pytest.fixture
def tutor_appointment():
    """A CONFIRMED appointment booked by a tutor, with TutorPatient link."""
    practice = PracticeFactory()
    tutor = UserFactory()
    patient = PatientFactory(practice=practice)
    TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
    appointment = AppointmentFactory(
        practice=practice,
        patient=patient,
        status=Appointment.CONFIRMED,
        booked_by=tutor,
    )
    return appointment, tutor


# ---------------------------------------------------------------------------
# GET /a/{token}/ — TokenResolveView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTokenResolveView:
    """GET /api/v1/appointments/resolve/{token}/ — public, no auth required."""

    def test_valid_token_returns_200_with_appointment_details(self, api_client, confirmed_appointment):
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CONFIRM,
        )
        url = f"/api/v1/appointments/resolve/{token.token}/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["action"] == AppointmentToken.CONFIRM
        assert data["appointment_id"] == confirmed_appointment.pk
        assert "scheduled_date" in data
        assert "start_time" in data
        assert "location_name" in data
        assert "patient_first_name" in data
        assert "action_available" in data

    def test_valid_confirm_token_action_available_true(self, api_client, confirmed_appointment):
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CONFIRM,
        )
        url = f"/api/v1/appointments/resolve/{token.token}/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["action_available"] is True

    def test_valid_reschedule_token_action_available_false(self, api_client, confirmed_appointment):
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.RESCHEDULE,
        )
        url = f"/api/v1/appointments/resolve/{token.token}/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["action_available"] is False

    def test_expired_token_returns_410(self, api_client, confirmed_appointment):
        past = timezone.now() - datetime.timedelta(hours=1)
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            expires_at=past,
        )
        url = f"/api/v1/appointments/resolve/{token.token}/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_410_GONE

    def test_used_token_returns_410(self, api_client, confirmed_appointment):
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            used_at=timezone.now() - datetime.timedelta(hours=1),
        )
        url = f"/api/v1/appointments/resolve/{token.token}/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_410_GONE

    def test_nonexistent_token_returns_404(self, api_client):
        url = "/api/v1/appointments/resolve/nonexistenttoken123456789abcdef/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_no_auth_required(self, api_client, confirmed_appointment):
        """Public endpoint — unauthenticated request should work fine."""
        token = AppointmentTokenFactory(appointment=confirmed_appointment)
        url = f"/api/v1/appointments/resolve/{token.token}/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# POST /api/v1/appointments/action/ — AppointmentActionView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAppointmentActionView:
    """POST /api/v1/appointments/action/ — public, no auth required."""

    def get_url(self):
        return "/api/v1/appointments/action/"

    def test_confirm_token_sets_attendance_confirmed(self, api_client, confirmed_appointment):
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CONFIRM,
        )
        url = self.get_url()
        response = api_client.post(url, {"token": token.token}, format="json")

        assert response.status_code == status.HTTP_200_OK
        confirmed_appointment.refresh_from_db()
        assert confirmed_appointment.attendance_confirmed is True

    def test_confirm_token_marks_token_used(self, api_client, confirmed_appointment):
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CONFIRM,
        )
        url = self.get_url()
        api_client.post(url, {"token": token.token}, format="json")

        token.refresh_from_db()
        assert token.used_at is not None

    def test_cancel_token_returns_200_cancelled(
        self, api_client, confirmed_appointment
    ):
        """CANCEL token now executes cancel and returns status=cancelled."""
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CANCEL,
        )
        url = self.get_url()
        with patch("apps.scheduling.services.cancellation.cancel_appointment") as mock_ca:
            mock_ca.return_value = {
                "appointment": confirmed_appointment,
                "refund_info": None,
            }
            response = api_client.post(url, {"token": token.token}, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data.get("status") == "cancelled"
        assert data.get("success") is True

    def test_cancel_token_marks_token_used(
        self, api_client, confirmed_appointment
    ):
        """CANCEL token is consumed after successful cancellation."""
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CANCEL,
        )
        url = self.get_url()
        with patch("apps.scheduling.services.cancellation.cancel_appointment") as mock_ca:
            mock_ca.return_value = {
                "appointment": confirmed_appointment,
                "refund_info": None,
            }
            api_client.post(url, {"token": token.token}, format="json")

        token.refresh_from_db()
        assert token.used_at is not None

    def test_reschedule_token_returns_200_redirect(self, api_client, confirmed_appointment):
        """RESCHEDULE token returns success=True with reschedule_url, status=redirect."""
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.RESCHEDULE,
        )
        url = self.get_url()
        response = api_client.post(url, {"token": token.token}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("status") == "redirect"
        assert response.data.get("success") is True
        assert "reschedule_url" in response.data

    def test_expired_token_returns_410(self, api_client, confirmed_appointment):
        past = timezone.now() - datetime.timedelta(hours=1)
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            expires_at=past,
        )
        url = self.get_url()
        response = api_client.post(url, {"token": token.token}, format="json")

        assert response.status_code == status.HTTP_410_GONE

    def test_used_token_returns_410(self, api_client, confirmed_appointment):
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            used_at=timezone.now() - datetime.timedelta(hours=1),
        )
        url = self.get_url()
        response = api_client.post(url, {"token": token.token}, format="json")

        assert response.status_code == status.HTTP_410_GONE

    def test_nonexistent_token_returns_404(self, api_client):
        url = self.get_url()
        response = api_client.post(url, {"token": "doesnotexist123"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_token_field_returns_400(self, api_client):
        url = self.get_url()
        response = api_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_confirm_token_used_twice_returns_410(self, api_client, confirmed_appointment):
        """Using the CONFIRM token a second time should return 410 (token already used)."""
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CONFIRM,
        )
        url = self.get_url()
        # First use
        r1 = api_client.post(url, {"token": token.token}, format="json")
        assert r1.status_code == status.HTTP_200_OK

        # Second use
        r2 = api_client.post(url, {"token": token.token}, format="json")
        assert r2.status_code == status.HTTP_410_GONE

    def test_no_auth_required(self, api_client, confirmed_appointment):
        """Public endpoint — unauthenticated request with valid token should work."""
        token = AppointmentTokenFactory(
            appointment=confirmed_appointment,
            action=AppointmentToken.CONFIRM,
        )
        url = self.get_url()
        response = api_client.post(url, {"token": token.token}, format="json")

        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# POST /api/v1/appointments/{id}/confirm-attendance/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestConfirmAttendanceAction:
    """Authenticated confirm-attendance @action on AppointmentViewSet."""

    def get_url(self, appointment_id):
        return reverse("scheduling:appointment-confirm-attendance", args=[appointment_id])

    def test_tutor_confirms_own_appointment(self, api_client, tutor_appointment):
        appointment, tutor = tutor_appointment
        client = APIClient()
        client.force_authenticate(user=tutor)

        url = self.get_url(appointment.pk)
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        appointment.refresh_from_db()
        assert appointment.attendance_confirmed is True
        assert appointment.attendance_confirmed_via == "PORTAL"
        assert appointment.attendance_confirmed_at is not None

    def test_confirm_attendance_idempotent(self, api_client, tutor_appointment):
        """Calling confirm-attendance twice on already-confirmed appointment returns 200."""
        appointment, tutor = tutor_appointment
        client = APIClient()
        client.force_authenticate(user=tutor)

        url = self.get_url(appointment.pk)
        client.post(url)
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        appointment.refresh_from_db()
        assert appointment.attendance_confirmed is True

    def test_non_confirmed_appointment_returns_400(self, api_client):
        """confirm-attendance on a PENDING appointment returns 400."""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(
            practice=practice,
            patient=patient,
            status=Appointment.PENDING,
            booked_by=tutor,
        )
        client = APIClient()
        client.force_authenticate(user=tutor)

        url = self.get_url(appointment.pk)
        response = client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_different_tutor_cannot_confirm(self, api_client, tutor_appointment):
        """A tutor who doesn't own the appointment gets 404."""
        appointment, _owner_tutor = tutor_appointment
        other_tutor = UserFactory()
        client = APIClient()
        client.force_authenticate(user=other_tutor)

        url = self.get_url(appointment.pk)
        response = client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_returns_401(self, api_client, tutor_appointment):
        appointment, _ = tutor_appointment
        url = self.get_url(appointment.pk)
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
