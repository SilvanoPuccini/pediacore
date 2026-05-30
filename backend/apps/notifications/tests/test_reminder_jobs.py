"""
Tests for reminder job functions in notifications.services.reminder_jobs.

Covers:
  - send_24h_reminders(): window logic, already-sent skip, non-CONFIRMED skip
  - send_2h_reminders(): online-only, correct window, already-sent skip
  - mark_no_shows(): past CONFIRMED+unconfirmed → NO_SHOW; does not touch confirmed/non-CONFIRMED

Uses freezegun for deterministic datetime comparisons.

Timezone notes
--------------
Django settings: TIME_ZONE = "America/Santiago" (UTC-4 in winter / UTC-3 in summer).
Assuming UTC-4 for tests (June is winter in the southern hemisphere).

FROZEN_NOW = "2026-06-01 12:00:00" UTC = 2026-06-01 08:00 Santiago.

24h window: [now+23.5h, now+24.5h] UTC = [2026-06-02 11:30, 12:30 UTC]
  = [2026-06-02 07:30, 08:30 Santiago]
  → "in-window" appointment: 2026-06-02 08:00 Santiago → 12:00 UTC ✓
  → "outside" appointment:   2026-06-03 08:00 Santiago → far future ✓

2h window: [now+1.75h, now+2.25h] UTC = [2026-06-01 13:45, 14:15 UTC]
  = [2026-06-01 09:45, 10:15 Santiago]
  → "in-window" appointment: 2026-06-01 10:00 Santiago → 14:00 UTC ✓
  → "outside" appointment:   2026-06-01 12:00 Santiago → 16:00 UTC ✓

no-show cutoff: now - 30min = 2026-06-01 11:30 UTC = 2026-06-01 07:30 Santiago
  → "past" appointment: 2026-06-01 07:00 Santiago → 11:00 UTC ≤ 11:30 ✓
  → "future" appointment: 2026-06-02 08:00 Santiago → 12:00 UTC > 11:30 ✓
"""

from __future__ import annotations

import datetime

import pytest
from django.utils import timezone
from freezegun import freeze_time

from apps.notifications.services.reminder_jobs import (
    mark_no_shows,
    send_24h_reminders,
    send_2h_reminders,
)
from apps.scheduling.models import Appointment
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import UserFactory


# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

FROZEN_NOW = "2026-06-01 12:00:00"  # 2026-06-01 12:00 UTC = 08:00 Santiago (UTC-4)

# 24h window: appointment at 08:00 Santiago on 2026-06-02 = 12:00 UTC
DATE_24H = datetime.date(2026, 6, 2)
TIME_24H = datetime.time(8, 0)   # 08:00 Santiago → 12:00 UTC (in window)

# 2h window: appointment at 10:00 Santiago on 2026-06-01 = 14:00 UTC
DATE_2H = datetime.date(2026, 6, 1)
TIME_2H = datetime.time(10, 0)   # 10:00 Santiago → 14:00 UTC (in window)

# Outside 2h window: 12:00 Santiago = 16:00 UTC
TIME_2H_OUTSIDE = datetime.time(12, 0)

# No-show: 07:00 Santiago on 2026-06-01 = 11:00 UTC (before cutoff 11:30)
DATE_PAST = datetime.date(2026, 6, 1)
TIME_PAST = datetime.time(7, 0)   # 07:00 Santiago → 11:00 UTC (past cutoff)

# Future: 08:00 Santiago on 2026-06-02 = 12:00 UTC (NOT past)
DATE_FUTURE = datetime.date(2026, 6, 2)
TIME_FUTURE = datetime.time(8, 0)  # same as DATE_24H / TIME_24H


def _make_appointment(practice, patient, **kwargs):
    """Shortcut to create an appointment with CONFIRMED status."""
    defaults = {
        "practice": practice,
        "patient": patient,
        "status": Appointment.CONFIRMED,
        "is_online": False,
    }
    defaults.update(kwargs)
    return AppointmentFactory(**defaults)


# ---------------------------------------------------------------------------
# send_24h_reminders
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSend24hReminders:
    @freeze_time(FROZEN_NOW)
    def test_sends_reminder_in_24h_window(self, settings):
        """Appointment at now+24h (in Santiago local time) is in window → reminder sent."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=DATE_24H,
            start_time=TIME_24H,
            reminder_24h_sent=False,
        )

        count = send_24h_reminders()
        assert count == 1

    @freeze_time(FROZEN_NOW)
    def test_skips_already_sent(self, settings):
        """Appointment with reminder_24h_sent=True is skipped."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=DATE_24H,
            start_time=TIME_24H,
            reminder_24h_sent=True,
        )

        count = send_24h_reminders()
        assert count == 0

    @freeze_time(FROZEN_NOW)
    def test_skips_non_confirmed_appointments(self, settings):
        """PENDING appointment in window is skipped."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        AppointmentFactory(
            practice=practice,
            patient=patient,
            status=Appointment.PENDING,
            scheduled_date=DATE_24H,
            start_time=TIME_24H,
            reminder_24h_sent=False,
        )

        count = send_24h_reminders()
        assert count == 0

    @freeze_time(FROZEN_NOW)
    def test_skips_appointment_outside_window(self, settings):
        """Appointment at now+48h is outside 23.5–24.5h window."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=datetime.date(2026, 6, 3),  # +48h
            start_time=TIME_24H,
            reminder_24h_sent=False,
        )

        count = send_24h_reminders()
        assert count == 0

    @freeze_time(FROZEN_NOW)
    def test_sets_reminder_24h_sent_flag_on_sent(self, settings):
        """After send_24h_reminders runs, reminder_24h_sent is True on the appointment."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        appt = _make_appointment(
            practice, patient,
            scheduled_date=DATE_24H,
            start_time=TIME_24H,
            reminder_24h_sent=False,
        )

        send_24h_reminders()

        appt.refresh_from_db()
        assert appt.reminder_24h_sent is True

    @freeze_time(FROZEN_NOW)
    def test_returns_correct_count_multiple(self, settings):
        """Returns count of reminders actually sent across multiple appointments."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()

        for _ in range(3):
            tutor = UserFactory()
            patient = PatientFactory(practice=practice)
            TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
            _make_appointment(
                practice, patient,
                scheduled_date=DATE_24H,
                start_time=TIME_24H,
                reminder_24h_sent=False,
            )

        count = send_24h_reminders()
        assert count == 3


# ---------------------------------------------------------------------------
# send_2h_reminders
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSend2hReminders:
    @freeze_time(FROZEN_NOW)
    def test_sends_reminder_for_online_appointment_in_window(self, settings):
        """Online appointment at now+2h (local) is in window → reminder sent."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=DATE_2H,
            start_time=TIME_2H,
            is_online=True,
            meeting_link="https://meet.example.com/room",
            reminder_2h_sent=False,
        )

        count = send_2h_reminders()
        assert count == 1

    @freeze_time(FROZEN_NOW)
    def test_skips_in_person_appointment(self, settings):
        """In-person appointment in window is skipped by 2h job."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=DATE_2H,
            start_time=TIME_2H,
            is_online=False,
            reminder_2h_sent=False,
        )

        count = send_2h_reminders()
        assert count == 0

    @freeze_time(FROZEN_NOW)
    def test_skips_already_sent(self, settings):
        """Online appointment with reminder_2h_sent=True is skipped."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=DATE_2H,
            start_time=TIME_2H,
            is_online=True,
            reminder_2h_sent=True,
        )

        count = send_2h_reminders()
        assert count == 0

    @freeze_time(FROZEN_NOW)
    def test_skips_appointment_outside_window(self, settings):
        """Online appointment at now+4h is outside 1.75–2.25h window."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=DATE_2H,
            start_time=TIME_2H_OUTSIDE,  # 12:00 Santiago = 16:00 UTC (outside window)
            is_online=True,
            reminder_2h_sent=False,
        )

        count = send_2h_reminders()
        assert count == 0

    @freeze_time(FROZEN_NOW)
    def test_sets_reminder_2h_sent_flag(self, settings):
        """After job runs, reminder_2h_sent=True on the appointment."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        appt = _make_appointment(
            practice, patient,
            scheduled_date=DATE_2H,
            start_time=TIME_2H,
            is_online=True,
            reminder_2h_sent=False,
        )

        send_2h_reminders()

        appt.refresh_from_db()
        assert appt.reminder_2h_sent is True


# ---------------------------------------------------------------------------
# mark_no_shows
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMarkNoShows:
    @freeze_time(FROZEN_NOW)
    def test_marks_past_confirmed_unconfirmed_as_no_show(self, settings):
        """CONFIRMED appointment in the past with attendance_confirmed=False → NO_SHOW."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)

        # 07:00 Santiago = 11:00 UTC, cutoff = now-30min = 11:30 UTC → 11:00 < 11:30 ✓
        appt = _make_appointment(
            practice, patient,
            scheduled_date=DATE_PAST,
            start_time=TIME_PAST,
            status=Appointment.CONFIRMED,
            attendance_confirmed=False,
        )

        count = mark_no_shows()
        assert count == 1

        appt.refresh_from_db()
        assert appt.status == Appointment.NO_SHOW

    @freeze_time(FROZEN_NOW)
    def test_does_not_mark_attendance_confirmed(self, settings):
        """attendance_confirmed=True appointments are NOT marked as no-show."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)

        appt = _make_appointment(
            practice, patient,
            scheduled_date=DATE_PAST,
            start_time=TIME_PAST,
            status=Appointment.CONFIRMED,
            attendance_confirmed=True,
        )

        count = mark_no_shows()
        assert count == 0

        appt.refresh_from_db()
        assert appt.status == Appointment.CONFIRMED

    @freeze_time(FROZEN_NOW)
    def test_does_not_mark_non_confirmed_appointments(self, settings):
        """PENDING/CANCELLED appointments in the past are NOT marked as no-show."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)

        for appt_status in [Appointment.PENDING, Appointment.CANCELLED, Appointment.COMPLETED]:
            AppointmentFactory(
                practice=practice,
                patient=patient,
                status=appt_status,
                scheduled_date=DATE_PAST,
                start_time=TIME_PAST,
                attendance_confirmed=False,
            )

        count = mark_no_shows()
        assert count == 0

    @freeze_time(FROZEN_NOW)
    def test_does_not_mark_future_appointments(self, settings):
        """CONFIRMED appointment in the future is NOT marked as no-show."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)

        appt = _make_appointment(
            practice, patient,
            scheduled_date=DATE_FUTURE,
            start_time=TIME_FUTURE,
            attendance_confirmed=False,
        )

        count = mark_no_shows()
        assert count == 0

        appt.refresh_from_db()
        assert appt.status == Appointment.CONFIRMED

    @freeze_time(FROZEN_NOW)
    def test_is_idempotent(self, settings):
        """Running mark_no_shows twice does not double-count."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)

        _make_appointment(
            practice, patient,
            scheduled_date=DATE_PAST,
            start_time=TIME_PAST,
            attendance_confirmed=False,
        )

        count1 = mark_no_shows()
        count2 = mark_no_shows()

        assert count1 == 1
        assert count2 == 0  # already NO_SHOW, not CONFIRMED anymore

    @freeze_time(FROZEN_NOW)
    def test_returns_count(self, settings):
        """Returns the number of appointments marked as no-show."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()

        for _ in range(4):
            patient = PatientFactory(practice=practice)
            _make_appointment(
                practice, patient,
                scheduled_date=DATE_PAST,
                start_time=TIME_PAST,
                attendance_confirmed=False,
            )

        count = mark_no_shows()
        assert count == 4
