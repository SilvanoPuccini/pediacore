from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.scheduling.models import Appointment
from apps.scheduling.services.availability import get_available_slots
from apps.scheduling.services.cancellation import cancel_appointment, get_cancellation_penalty
from tests.factories.practice import (
    BlockedSlotFactory,
    LocationFactory,
    PracticeFactory,
    ServiceFactory,
    WorkingHoursFactory,
)
from tests.factories.scheduling import (
    AppointmentFactory,
    CancellationPolicyFactory,
    CancellationTierFactory,
)
from apps.practice.models import WorkingHours


@pytest.mark.django_db
class TestAvailabilityService:
    def test_returns_slots_for_valid_date(self):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        date = datetime.date(2026, 6, 1)  # Monday
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=WorkingHours.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(11, 0),
        )

        slots = get_available_slots(location.id, service.id, date)

        assert len(slots) == 4  # 9:00, 9:30, 10:00, 10:30
        assert slots[0]["start_time"] == "09:00"
        assert slots[0]["end_time"] == "09:30"
        assert slots[0]["available"] is True

    def test_returns_empty_when_no_working_hours(self):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        date = datetime.date(2026, 6, 1)  # Monday — no working hours configured

        slots = get_available_slots(location.id, service.id, date)

        assert slots == []

    def test_excludes_slots_overlapping_blocked_slot(self):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        date = datetime.date(2026, 6, 1)  # Monday
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=WorkingHours.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(11, 0),
        )
        block_start = timezone.make_aware(datetime.datetime(2026, 6, 1, 9, 0))
        block_end = timezone.make_aware(datetime.datetime(2026, 6, 1, 10, 0))
        BlockedSlotFactory(
            practice=practice,
            location=location,
            start_datetime=block_start,
            end_datetime=block_end,
        )

        slots = get_available_slots(location.id, service.id, date)

        start_times = [s["start_time"] for s in slots]
        assert "09:00" not in start_times
        assert "09:30" not in start_times
        assert "10:00" in start_times

    def test_excludes_slots_with_existing_appointments(self):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        date = datetime.date(2026, 6, 1)  # Monday
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=WorkingHours.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(11, 0),
        )
        AppointmentFactory(
            practice=practice,
            location=location,
            scheduled_date=date,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            status=Appointment.CONFIRMED,
        )

        slots = get_available_slots(location.id, service.id, date)

        start_times = [s["start_time"] for s in slots]
        assert "10:00" not in start_times
        assert "09:00" in start_times

    def test_cancelled_appointments_do_not_block_slots(self):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        date = datetime.date(2026, 6, 1)  # Monday
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=WorkingHours.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(10, 0),
        )
        AppointmentFactory(
            practice=practice,
            location=location,
            scheduled_date=date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
            status=Appointment.CANCELLED,
        )

        slots = get_available_slots(location.id, service.id, date)

        start_times = [s["start_time"] for s in slots]
        assert "09:00" in start_times

    def test_returns_empty_for_invalid_location(self):
        service = ServiceFactory()
        date = datetime.date(2026, 6, 1)

        slots = get_available_slots(99999, service.id, date)

        assert slots == []

    def test_returns_empty_for_invalid_service(self):
        location = LocationFactory()
        date = datetime.date(2026, 6, 1)

        slots = get_available_slots(location.id, 99999, date)

        assert slots == []

    def test_global_blocked_slot_applies_to_location(self):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30)
        date = datetime.date(2026, 6, 1)  # Monday
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=WorkingHours.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(10, 0),
        )
        block_start = timezone.make_aware(datetime.datetime(2026, 6, 1, 9, 0))
        block_end = timezone.make_aware(datetime.datetime(2026, 6, 1, 10, 0))
        BlockedSlotFactory(
            practice=practice,
            location=None,  # global block
            start_datetime=block_start,
            end_datetime=block_end,
        )

        slots = get_available_slots(location.id, service.id, date)

        assert slots == []


@pytest.mark.django_db
class TestCancellationService:
    def test_penalty_no_policy(self):
        appt = AppointmentFactory(
            scheduled_date=datetime.date.today() + datetime.timedelta(days=3),
            start_time=datetime.time(10, 0),
        )
        result = get_cancellation_penalty(appt)

        assert result["penalty_percentage"] == Decimal("0.00")
        assert "No cancellation policy" in result["tier_description"]

    def test_penalty_free_cancellation_48h_plus(self):
        practice = PracticeFactory()
        policy = CancellationPolicyFactory(practice=practice)
        CancellationTierFactory(
            policy=policy,
            min_hours_before=48,
            penalty_percentage=Decimal("0.00"),
            description="Free cancellation",
        )
        CancellationTierFactory(
            policy=policy,
            min_hours_before=24,
            penalty_percentage=Decimal("50.00"),
            description="50% penalty",
        )
        CancellationTierFactory(
            policy=policy,
            min_hours_before=0,
            penalty_percentage=Decimal("100.00"),
            description="Full penalty",
        )

        future_date = datetime.date.today() + datetime.timedelta(days=5)
        appt = AppointmentFactory(
            practice=practice,
            scheduled_date=future_date,
            start_time=datetime.time(10, 0),
        )
        result = get_cancellation_penalty(appt)

        assert result["penalty_percentage"] == Decimal("0.00")
        assert result["tier_description"] == "Free cancellation"

    def test_penalty_50_percent_between_24_48h(self):
        practice = PracticeFactory()
        policy = CancellationPolicyFactory(practice=practice)
        CancellationTierFactory(
            policy=policy,
            min_hours_before=48,
            penalty_percentage=Decimal("0.00"),
            description="Free cancellation",
        )
        CancellationTierFactory(
            policy=policy,
            min_hours_before=24,
            penalty_percentage=Decimal("50.00"),
            description="50% penalty",
        )
        CancellationTierFactory(
            policy=policy,
            min_hours_before=0,
            penalty_percentage=Decimal("100.00"),
            description="Full penalty",
        )

        future_date = datetime.date.today() + datetime.timedelta(days=1)
        appt = AppointmentFactory(
            practice=practice,
            scheduled_date=future_date,
            start_time=datetime.time(12, 0),
        )
        result = get_cancellation_penalty(appt)

        assert result["penalty_percentage"] in (Decimal("50.00"), Decimal("100.00"))

    def test_cancel_appointment_sets_status(self):
        appt = AppointmentFactory(status=Appointment.PENDING)
        cancelled = cancel_appointment(appt, reason="Changed plans")

        assert cancelled.status == Appointment.CANCELLED
        assert cancelled.cancellation_reason == "Changed plans"
        assert cancelled.cancelled_at is not None

    def test_cancel_appointment_persists_to_db(self):
        appt = AppointmentFactory(status=Appointment.PENDING)
        cancel_appointment(appt, reason="Test reason")

        refreshed = Appointment.objects.get(pk=appt.pk)
        assert refreshed.status == Appointment.CANCELLED
        assert refreshed.cancellation_reason == "Test reason"

    def test_penalty_hours_until_positive_future(self):
        appt = AppointmentFactory(
            scheduled_date=datetime.date.today() + datetime.timedelta(days=3),
            start_time=datetime.time(10, 0),
        )
        result = get_cancellation_penalty(appt)

        assert result["hours_until"] > 0
