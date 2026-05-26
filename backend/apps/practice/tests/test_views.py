"""
Tests for practice app views.

Covers: public read-only endpoints and admin (IsDoctor) endpoints.
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.practice.models import WorkingHours
from tests.factories.practice import (
    BlockedSlotFactory,
    LocationFactory,
    PracticeFactory,
    ServiceFactory,
    WorkingHoursFactory,
)
from tests.factories.users import DoctorFactory, UserFactory


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def doctor_client() -> APIClient:
    client = APIClient()
    doctor = DoctorFactory()
    client.force_authenticate(user=doctor)
    return client, doctor


@pytest.fixture
def tutor_client() -> APIClient:
    client = APIClient()
    tutor = UserFactory()
    client.force_authenticate(user=tutor)
    return client


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPracticeDetailView:
    def test_returns_200_for_active_practice(self, api_client):
        practice = PracticeFactory()
        url = reverse("practice:practice-detail", kwargs={"slug": practice.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == practice.slug

    def test_returns_404_for_inactive_practice(self, api_client):
        practice = PracticeFactory(is_active=False)
        url = reverse("practice:practice-detail", kwargs={"slug": practice.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_returns_404_for_nonexistent_slug(self, api_client):
        url = reverse("practice:practice-detail", kwargs={"slug": "does-not-exist"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestLocationListView:
    def test_returns_active_locations_only(self, api_client):
        practice = PracticeFactory()
        active = LocationFactory(practice=practice, is_active=True)
        LocationFactory(practice=practice, is_active=False)
        url = reverse("practice:location-list", kwargs={"slug": practice.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert active.id in ids
        assert len(ids) == 1

    def test_returns_empty_list_when_no_locations(self, api_client):
        practice = PracticeFactory()
        url = reverse("practice:location-list", kwargs={"slug": practice.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []

    def test_returns_404_for_unknown_practice(self, api_client):
        url = reverse("practice:location-list", kwargs={"slug": "unknown"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestServiceListView:
    def test_returns_active_services_only(self, api_client):
        practice = PracticeFactory()
        active = ServiceFactory(practice=practice, is_active=True)
        ServiceFactory(practice=practice, is_active=False)
        url = reverse("practice:service-list", kwargs={"slug": practice.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert active.id in ids
        assert len(ids) == 1

    def test_service_includes_location_names(self, api_client):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice, name="Pucón")
        service = ServiceFactory(practice=practice)
        service.locations.add(location)
        url = reverse("practice:service-list", kwargs={"slug": practice.slug})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"][0]["location_names"] == ["Pucón"]


@pytest.mark.django_db
class TestWorkingHoursListView:
    def test_returns_working_hours_for_location(self, api_client):
        wh = WorkingHoursFactory()
        url = reverse("practice:working-hours-list", kwargs={"pk": wh.location.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == wh.id

    def test_returns_only_active_working_hours(self, api_client):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        WorkingHoursFactory(practice=practice, location=location, day_of_week=WorkingHours.MONDAY, is_active=True)
        WorkingHoursFactory(practice=practice, location=location, day_of_week=WorkingHours.TUESDAY, is_active=False)
        url = reverse("practice:working-hours-list", kwargs={"pk": location.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_returns_404_for_inactive_location(self, api_client):
        location = LocationFactory(is_active=False)
        url = reverse("practice:working-hours-list", kwargs={"pk": location.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestWorkingHoursAdminViewSet:
    def test_doctor_can_create_working_hours(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        location = LocationFactory(practice=practice)
        url = reverse("practice:admin-working-hours-list")
        payload = {
            "practice": practice.id,
            "location": location.id,
            "day_of_week": WorkingHours.WEDNESDAY,
            "start_time": "09:00:00",
            "end_time": "17:00:00",
            "is_active": True,
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["day_of_week"] == WorkingHours.WEDNESDAY

    def test_tutor_cannot_create_working_hours(self, tutor_client):
        url = reverse("practice:admin-working-hours-list")
        response = tutor_client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_create_working_hours(self, api_client):
        url = reverse("practice:admin-working-hours-list")
        response = api_client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_doctor_can_list_working_hours(self, doctor_client):
        client, _ = doctor_client
        WorkingHoursFactory()
        url = reverse("practice:admin-working-hours-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_invalid_times_return_400(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        location = LocationFactory(practice=practice)
        url = reverse("practice:admin-working-hours-list")
        payload = {
            "practice": practice.id,
            "location": location.id,
            "day_of_week": WorkingHours.MONDAY,
            "start_time": "18:00:00",
            "end_time": "09:00:00",
            "is_active": True,
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestBlockedSlotAdminViewSet:
    def test_doctor_can_create_blocked_slot(self, doctor_client):
        from django.utils import timezone

        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        location = LocationFactory(practice=practice)
        start = timezone.now()
        end = start + timezone.timedelta(hours=4)
        url = reverse("practice:admin-blocked-slots-list")
        payload = {
            "practice": practice.id,
            "location": location.id,
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "reason": "Feriado nacional",
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["reason"] == "Feriado nacional"

    def test_tutor_cannot_create_blocked_slot(self, tutor_client):
        url = reverse("practice:admin-blocked-slots-list")
        response = tutor_client.post(url, data={}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_doctor_can_create_blocked_slot_without_location(self, doctor_client):
        from django.utils import timezone

        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        start = timezone.now()
        end = start + timezone.timedelta(days=7)
        url = reverse("practice:admin-blocked-slots-list")
        payload = {
            "practice": practice.id,
            "location": None,
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "reason": "Vacaciones",
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["location"] is None
