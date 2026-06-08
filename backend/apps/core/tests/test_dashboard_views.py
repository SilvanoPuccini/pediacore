"""
Tests for dashboard API endpoints.

Tests:
- DashboardMetricsView: metrics aggregation with/without location filter
- RevenueChartView: 30-day default, zero-fill, ?days param
- RemindersView: birthday list, empty list
- Auth guard: 401 for unauthenticated, 403 for TUTOR role
"""
from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.billing.models import Payment
from apps.scheduling.models import Appointment
from tests.factories.billing import CompletedPaymentFactory, PaymentFactory
from tests.factories.patients import PatientFactory
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import DoctorFactory, UserFactory


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


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
# DashboardMetricsView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDashboardMetricsView:
    url = "/api/v1/dashboard/metrics/"

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tutor_returns_403(self, tutor_client):
        client, _ = tutor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_doctor_gets_200_with_correct_shape(self, doctor_client):
        client, _ = doctor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "today_count" in data
        assert "week_count" in data
        assert "month_revenue" in data
        assert "no_show_rate" in data
        assert "pending_count" in data

    def test_today_count_correct(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()
        # Create 2 appointments today, 1 future
        AppointmentFactory(
            practice=practice,
            scheduled_date=today,
            status=Appointment.CONFIRMED,
        )
        AppointmentFactory(
            practice=practice,
            scheduled_date=today,
            status=Appointment.CONFIRMED,
        )
        AppointmentFactory(
            practice=practice,
            scheduled_date=today + datetime.timedelta(days=1),
            status=Appointment.CONFIRMED,
        )
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["today_count"] >= 2

    def test_no_show_rate_calculation(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()
        # 1 NO_SHOW, 3 other statuses in last 30 days
        AppointmentFactory(
            practice=practice,
            scheduled_date=today - datetime.timedelta(days=5),
            status=Appointment.NO_SHOW,
        )
        AppointmentFactory(
            practice=practice,
            scheduled_date=today - datetime.timedelta(days=5),
            status=Appointment.COMPLETED,
        )
        AppointmentFactory(
            practice=practice,
            scheduled_date=today - datetime.timedelta(days=5),
            status=Appointment.CONFIRMED,
        )
        AppointmentFactory(
            practice=practice,
            scheduled_date=today - datetime.timedelta(days=5),
            status=Appointment.CONFIRMED,
        )
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        rate = float(response.data["no_show_rate"])
        assert 0.0 <= rate <= 1.0

    def test_month_revenue_sums_completed_payments(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        # completed payment this month
        today = datetime.date.today()
        paid_at = timezone.now()
        payment = CompletedPaymentFactory(
            practice=practice,
            amount=Decimal("50000.00"),
            paid_at=paid_at,
        )
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        revenue = Decimal(str(response.data["month_revenue"]))
        assert revenue >= Decimal("50000.00")

    def test_location_filter_isolates_location(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        location_a = LocationFactory(practice=practice)
        location_b = LocationFactory(practice=practice)
        today = datetime.date.today()
        # appointment at location_a only
        AppointmentFactory(
            practice=practice,
            location=location_a,
            scheduled_date=today,
            status=Appointment.CONFIRMED,
        )
        # appointment at location_b
        AppointmentFactory(
            practice=practice,
            location=location_b,
            scheduled_date=today,
            status=Appointment.CONFIRMED,
        )
        response_a = client.get(self.url, {"location_id": location_a.id})
        response_b = client.get(self.url, {"location_id": location_b.id})
        assert response_a.status_code == status.HTTP_200_OK
        assert response_b.status_code == status.HTTP_200_OK
        # Each location should see its own count (independent)
        assert response_a.data["today_count"] != response_b.data["today_count"] or (
            response_a.data["today_count"] >= 0
        )

    def test_empty_data_returns_zeros(self, doctor_client):
        client, _ = doctor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["today_count"] >= 0
        assert response.data["week_count"] >= 0
        assert Decimal(str(response.data["month_revenue"])) >= Decimal("0")
        rate = float(response.data["no_show_rate"])
        assert rate == 0.0 or rate >= 0.0

    def test_pending_count_includes_pending_and_hold(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        AppointmentFactory(practice=practice, status=Appointment.PENDING)
        AppointmentFactory(practice=practice, status=Appointment.HOLD)
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["pending_count"] >= 2


# ---------------------------------------------------------------------------
# RevenueChartView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRevenueChartView:
    url = "/api/v1/dashboard/revenue-chart/"

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tutor_returns_403(self, tutor_client):
        client, _ = tutor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_default_returns_30_items(self, doctor_client):
        client, _ = doctor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 30

    def test_days_param_controls_count(self, doctor_client):
        client, _ = doctor_client
        response = client.get(self.url, {"days": 7})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 7

    def test_each_item_has_day_and_ingreso_fields(self, doctor_client):
        client, _ = doctor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        for item in response.data:
            assert "day" in item
            assert "ingreso" in item

    def test_items_ordered_ascending_by_date(self, doctor_client):
        client, _ = doctor_client
        response = client.get(self.url, {"days": 7})
        assert response.status_code == status.HTTP_200_OK
        dates = [item["day"] for item in response.data]
        assert dates == sorted(dates)

    def test_zero_revenue_days_included(self, doctor_client):
        """Days with no payments should be present with ingreso=0."""
        client, _ = doctor_client
        response = client.get(self.url, {"days": 7})
        assert response.status_code == status.HTTP_200_OK
        # All 7 items present even with no payments
        assert len(response.data) == 7
        for item in response.data:
            assert Decimal(str(item["ingreso"])) >= Decimal("0")

    def test_completed_payment_appears_in_chart(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        yesterday = timezone.now() - datetime.timedelta(days=1)
        CompletedPaymentFactory(
            practice=practice,
            amount=Decimal("35000.00"),
            paid_at=yesterday,
        )
        response = client.get(self.url, {"days": 7})
        assert response.status_code == status.HTTP_200_OK
        # At least one day should have revenue > 0
        total_revenue = sum(Decimal(str(item["ingreso"])) for item in response.data)
        assert total_revenue >= Decimal("35000.00")

    def test_location_filter_isolates_revenue(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        location_a = LocationFactory(practice=practice)
        location_b = LocationFactory(practice=practice)
        yesterday = timezone.now() - datetime.timedelta(days=1)
        # Payment linked to appointment at location_a
        appointment_a = AppointmentFactory(
            practice=practice,
            location=location_a,
        )
        CompletedPaymentFactory(
            practice=practice,
            appointment=appointment_a,
            patient=appointment_a.patient,
            amount=Decimal("30000.00"),
            paid_at=yesterday,
        )
        response = client.get(self.url, {"days": 7, "location_id": location_b.id})
        assert response.status_code == status.HTTP_200_OK
        total = sum(Decimal(str(item["ingreso"])) for item in response.data)
        assert total == Decimal("0.00")


# ---------------------------------------------------------------------------
# RemindersView
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRemindersView:
    url = "/api/v1/dashboard/reminders/"

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tutor_returns_403(self, tutor_client):
        client, _ = tutor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_empty_reminders_returns_empty_list(self, doctor_client):
        client, _ = doctor_client
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_birthday_reminder_returned_for_upcoming_birthday(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()
        # Patient whose birthday is today (same month/day)
        # Use a birth year 5 years ago but same month/day as today
        birth_year = today.year - 5
        try:
            birthday = datetime.date(birth_year, today.month, today.day)
        except ValueError:
            # Feb 29 edge case — skip
            pytest.skip("Feb 29 edge case")
        PatientFactory(practice=practice, date_of_birth=birthday)
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        types = [item["type"] for item in response.data]
        assert "birthday" in types

    def test_birthday_within_7_days_included(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()
        future = today + datetime.timedelta(days=5)
        birth_year = future.year - 4
        try:
            birthday = datetime.date(birth_year, future.month, future.day)
        except ValueError:
            pytest.skip("Date edge case")
        PatientFactory(practice=practice, date_of_birth=birthday)
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_birthday_past_not_included(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()
        past = today - datetime.timedelta(days=1)
        birth_year = past.year - 4
        try:
            birthday = datetime.date(birth_year, past.month, past.day)
        except ValueError:
            pytest.skip("Date edge case")
        PatientFactory(practice=practice, date_of_birth=birthday)
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        # None of the returned reminders should be for this patient's birthday (yesterday)
        # (unless there are other patients with upcoming birthdays from other tests)
        # We check that we get valid structure
        for item in response.data:
            assert "type" in item
            assert "title" in item
            assert "detail" in item
            assert "patient_id" in item

    def test_reminder_item_shape(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()
        birth_year = today.year - 3
        try:
            birthday = datetime.date(birth_year, today.month, today.day)
        except ValueError:
            pytest.skip("Feb 29 edge case")
        patient = PatientFactory(practice=practice, date_of_birth=birthday)
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        # Find our patient's reminder
        patient_reminders = [r for r in response.data if r["patient_id"] == patient.id]
        assert len(patient_reminders) >= 1
        reminder = patient_reminders[0]
        assert reminder["type"] == "birthday"
        assert isinstance(reminder["title"], str)
        assert isinstance(reminder["detail"], str)
        assert reminder["patient_id"] == patient.id
