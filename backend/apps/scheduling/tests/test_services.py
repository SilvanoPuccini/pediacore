from __future__ import annotations

import datetime
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.notifications.models import Notification
from apps.scheduling.models import Appointment, WaitlistEntry
from apps.scheduling.services.auto_responder import check_and_send_auto_response
from apps.scheduling.services.availability import get_available_slots
from apps.scheduling.services.cancellation import cancel_appointment, get_cancellation_penalty
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import (
    BlockedSlotFactory,
    LocationFactory,
    PracticeFactory,
    ServiceFactory,
    WorkingHoursFactory,
)
from tests.factories.scheduling import (
    AppointmentFactory,
    AutoResponderConfigFactory,
    CancellationPolicyFactory,
    CancellationTierFactory,
    WaitlistEntryFactory,
)
from tests.factories.users import UserFactory
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
            slot_duration_minutes=30,
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
            slot_duration_minutes=30,
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
        result = cancel_appointment(appt, reason="Changed plans")

        # cancel_appointment() now returns a dict; check the appointment via refresh
        appt.refresh_from_db()
        assert appt.status == Appointment.CANCELLED
        assert appt.cancellation_reason == "Changed plans"
        assert appt.cancelled_at is not None

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


# ---------------------------------------------------------------------------
# Auto-responder service
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAutoResponderService:
    """Tests for check_and_send_auto_response()."""

    def _make_outside_hours_time(self) -> datetime.datetime:
        """Return an aware datetime that is clearly outside business hours (23:00)."""
        now = timezone.localtime(timezone.now())
        return now.replace(hour=23, minute=0, second=0, microsecond=0)

    def _make_inside_hours_time(self) -> datetime.datetime:
        """Return an aware datetime clearly within 09:00–18:00 (10:00)."""
        now = timezone.localtime(timezone.now())
        return now.replace(hour=10, minute=0, second=0, microsecond=0)

    # ------------------------------------------------------------------
    # Outside hours → notification sent
    # ------------------------------------------------------------------

    def test_outside_hours_sends_notification(self):
        """Appointment booked at 23:00 while hours are 09:00–18:00 → notify."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        AutoResponderConfigFactory(
            practice=practice,
            is_active=True,
            outside_hours_message="We are closed right now.",
        )

        fake_now = self._make_outside_hours_time()
        today_dow = fake_now.weekday()
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=today_dow,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(18, 0),
        )

        with patch("apps.scheduling.services.auto_responder.timezone.localtime") as mock_lt:
            mock_lt.return_value = fake_now
            result = check_and_send_auto_response(appointment)

        assert result is not None
        assert isinstance(result, Notification)
        assert result.recipient == appointment.booked_by
        assert result.message == "We are closed right now."
        assert result.related_type == "Appointment"
        assert result.related_id == appointment.pk

    def test_outside_hours_notification_persisted(self):
        """The notification created outside hours is saved to the database."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        AutoResponderConfigFactory(practice=practice, is_active=True)

        fake_now = self._make_outside_hours_time()
        today_dow = fake_now.weekday()
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=today_dow,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(18, 0),
        )

        with patch("apps.scheduling.services.auto_responder.timezone.localtime") as mock_lt:
            mock_lt.return_value = fake_now
            result = check_and_send_auto_response(appointment)

        assert Notification.objects.filter(pk=result.pk).exists()

    # ------------------------------------------------------------------
    # Inside hours → no notification
    # ------------------------------------------------------------------

    def test_inside_hours_returns_none(self):
        """Appointment booked at 10:00 while hours are 09:00–18:00 → no notification."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        AutoResponderConfigFactory(practice=practice, is_active=True)

        fake_now = self._make_inside_hours_time()
        today_dow = fake_now.weekday()
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=today_dow,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(18, 0),
        )

        with patch("apps.scheduling.services.auto_responder.timezone.localtime") as mock_lt:
            mock_lt.return_value = fake_now
            result = check_and_send_auto_response(appointment)

        assert result is None

    def test_inside_hours_no_notification_created(self):
        """No Notification row is created when booking is inside working hours."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        AutoResponderConfigFactory(practice=practice, is_active=True)

        fake_now = self._make_inside_hours_time()
        today_dow = fake_now.weekday()
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=today_dow,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(18, 0),
        )

        before_count = Notification.objects.count()
        with patch("apps.scheduling.services.auto_responder.timezone.localtime") as mock_lt:
            mock_lt.return_value = fake_now
            check_and_send_auto_response(appointment)

        assert Notification.objects.count() == before_count

    # ------------------------------------------------------------------
    # AutoResponder inactive → no notification
    # ------------------------------------------------------------------

    def test_inactive_config_returns_none(self):
        """If is_active=False, no notification is created regardless of the time."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        AutoResponderConfigFactory(practice=practice, is_active=False)

        fake_now = self._make_outside_hours_time()
        today_dow = fake_now.weekday()
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=today_dow,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(18, 0),
        )

        with patch("apps.scheduling.services.auto_responder.timezone.localtime") as mock_lt:
            mock_lt.return_value = fake_now
            result = check_and_send_auto_response(appointment)

        assert result is None

    def test_inactive_config_creates_no_notification(self):
        """Inactive config → zero Notification rows added."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        AutoResponderConfigFactory(practice=practice, is_active=False)

        fake_now = self._make_outside_hours_time()
        today_dow = fake_now.weekday()
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=today_dow,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(18, 0),
        )

        before_count = Notification.objects.count()
        with patch("apps.scheduling.services.auto_responder.timezone.localtime") as mock_lt:
            mock_lt.return_value = fake_now
            check_and_send_auto_response(appointment)

        assert Notification.objects.count() == before_count

    # ------------------------------------------------------------------
    # No AutoResponderConfig → no error, returns None
    # ------------------------------------------------------------------

    def test_no_config_returns_none_without_error(self):
        """Missing AutoResponderConfig must not raise; returns None silently."""
        appointment = AppointmentFactory()
        # No AutoResponderConfig created for this practice.

        result = check_and_send_auto_response(appointment)

        assert result is None

    def test_no_config_creates_no_notification(self):
        """Missing config → zero Notification rows added."""
        appointment = AppointmentFactory()

        before_count = Notification.objects.count()
        check_and_send_auto_response(appointment)

        assert Notification.objects.count() == before_count

    # ------------------------------------------------------------------
    # Edge cases
    # ------------------------------------------------------------------

    def test_no_booked_by_returns_none(self):
        """If booked_by is None, the service skips safely."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location, booked_by=None)
        AutoResponderConfigFactory(practice=practice, is_active=True)

        result = check_and_send_auto_response(appointment)

        assert result is None

    def test_no_working_hours_for_today_sends_notification(self):
        """No working hours defined for today → treated as outside hours → notify."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        AutoResponderConfigFactory(
            practice=practice,
            is_active=True,
            outside_hours_message="Outside hours.",
        )
        # Deliberately: no WorkingHours created for today.

        result = check_and_send_auto_response(appointment)

        assert result is not None
        assert result.recipient == appointment.booked_by

    def test_uses_outside_hours_message_from_config(self):
        """Notification message matches the config's outside_hours_message field."""
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, location=location)
        config = AutoResponderConfigFactory(
            practice=practice,
            is_active=True,
            outside_hours_message="Estamos cerrados. Te contactaremos pronto.",
        )

        fake_now = self._make_outside_hours_time()
        today_dow = fake_now.weekday()
        WorkingHoursFactory(
            practice=practice,
            location=location,
            day_of_week=today_dow,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(18, 0),
        )

        with patch("apps.scheduling.services.auto_responder.timezone.localtime") as mock_lt:
            mock_lt.return_value = fake_now
            result = check_and_send_auto_response(appointment)

        assert result.message == config.outside_hours_message


# ---------------------------------------------------------------------------
# Waitlist notification on cancellation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestWaitlistNotificationOnCancellation:
    """Tests for automatic waitlist notification triggered by cancel_appointment()."""

    def _make_appointment(self, practice=None, service=None, location=None):
        """Helper: create a confirmed appointment with explicit practice/service/location."""
        practice = practice or PracticeFactory()
        service = service or ServiceFactory(practice=practice)
        location = location or LocationFactory(practice=practice)
        return AppointmentFactory(
            practice=practice,
            service=service,
            location=location,
            scheduled_date=datetime.date(2026, 7, 15),
            status=Appointment.CONFIRMED,
        )

    # ------------------------------------------------------------------
    # Happy path: matching waitlist entry gets NOTIFIED
    # ------------------------------------------------------------------

    def test_matching_entry_status_becomes_notified(self):
        appt = self._make_appointment()
        entry = WaitlistEntryFactory(
            practice=appt.practice,
            service=appt.service,
            location=appt.location,
            preferred_date_start=datetime.date(2026, 7, 1),
            preferred_date_end=datetime.date(2026, 7, 31),
            status=WaitlistEntry.WAITING,
        )

        cancel_appointment(appt, reason="test")

        entry.refresh_from_db()
        assert entry.status == WaitlistEntry.NOTIFIED
        assert entry.notified_at is not None

    def test_matching_entry_receives_notification_record(self):
        appt = self._make_appointment()
        tutor = UserFactory()
        entry = WaitlistEntryFactory(
            practice=appt.practice,
            service=appt.service,
            location=appt.location,
            preferred_date_start=datetime.date(2026, 7, 1),
            preferred_date_end=datetime.date(2026, 7, 31),
            status=WaitlistEntry.WAITING,
        )
        TutorPatientFactory(
            practice=appt.practice,
            tutor=tutor,
            patient=entry.patient,
        )

        cancel_appointment(appt, reason="test")

        notifications = Notification.objects.filter(
            recipient=tutor,
            notification_type=Notification.WAITLIST_AVAILABLE,
            related_type="WaitlistEntry",
            related_id=entry.pk,
        )
        assert notifications.exists()

    def test_entry_with_null_location_matches_any_location(self):
        """A waitlist entry with location=None (any location) should be notified."""
        appt = self._make_appointment()
        entry = WaitlistEntryFactory(
            practice=appt.practice,
            service=appt.service,
            location=None,  # accepts any location
            preferred_date_start=datetime.date(2026, 7, 1),
            status=WaitlistEntry.WAITING,
        )

        cancel_appointment(appt, reason="test")

        entry.refresh_from_db()
        assert entry.status == WaitlistEntry.NOTIFIED

    def test_oldest_entry_is_notified_first(self):
        """When multiple WAITING entries match, the oldest one (first created) wins."""
        appt = self._make_appointment()
        older = WaitlistEntryFactory(
            practice=appt.practice,
            service=appt.service,
            location=appt.location,
            preferred_date_start=datetime.date(2026, 7, 1),
            status=WaitlistEntry.WAITING,
        )
        newer = WaitlistEntryFactory(
            practice=appt.practice,
            service=appt.service,
            location=appt.location,
            preferred_date_start=datetime.date(2026, 7, 1),
            status=WaitlistEntry.WAITING,
        )
        assert older.created_at <= newer.created_at

        cancel_appointment(appt, reason="test")

        older.refresh_from_db()
        newer.refresh_from_db()
        assert older.status == WaitlistEntry.NOTIFIED
        assert newer.status == WaitlistEntry.WAITING  # untouched

    # ------------------------------------------------------------------
    # Non-matching cases: entry stays WAITING
    # ------------------------------------------------------------------

    def test_different_service_entry_stays_waiting(self):
        practice = PracticeFactory()
        other_service = ServiceFactory(practice=practice)
        appt = self._make_appointment(practice=practice)
        entry = WaitlistEntryFactory(
            practice=practice,
            service=other_service,  # different service
            location=appt.location,
            preferred_date_start=datetime.date(2026, 7, 1),
            status=WaitlistEntry.WAITING,
        )

        cancel_appointment(appt, reason="test")

        entry.refresh_from_db()
        assert entry.status == WaitlistEntry.WAITING

    def test_no_waitlist_entries_does_not_raise(self):
        """Cancellation with no matching waitlist entries must not raise any exception."""
        appt = self._make_appointment()
        # no waitlist entries at all
        cancel_appointment(appt, reason="test")

        appt.refresh_from_db()
        assert appt.status == Appointment.CANCELLED

    def test_already_notified_entry_stays_notified(self):
        """An entry already in NOTIFIED state must not be selected or altered."""
        appt = self._make_appointment()
        original_ts = datetime.datetime(2026, 7, 10, 12, 0, 0, tzinfo=datetime.timezone.utc)
        entry = WaitlistEntryFactory(
            practice=appt.practice,
            service=appt.service,
            location=appt.location,
            preferred_date_start=datetime.date(2026, 7, 1),
            status=WaitlistEntry.NOTIFIED,
            notified_at=original_ts,
        )

        cancel_appointment(appt, reason="test")

        entry.refresh_from_db()
        assert entry.status == WaitlistEntry.NOTIFIED
        assert entry.notified_at == original_ts

    def test_entry_outside_preferred_date_range_stays_waiting(self):
        """Entry whose preferred_date_end is before the freed slot date is not notified."""
        appt = self._make_appointment()  # scheduled_date = 2026-07-15
        entry = WaitlistEntryFactory(
            practice=appt.practice,
            service=appt.service,
            location=appt.location,
            preferred_date_start=datetime.date(2026, 7, 1),
            preferred_date_end=datetime.date(2026, 7, 10),  # ends before slot date
            status=WaitlistEntry.WAITING,
        )

        cancel_appointment(appt, reason="test")

        entry.refresh_from_db()
        assert entry.status == WaitlistEntry.WAITING
