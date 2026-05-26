"""
Tests for notifications services (email_service and reminder_scheduler).
"""

from __future__ import annotations

import datetime
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.notifications.models import EmailLog, Notification, NotificationPreference
from apps.notifications.services.email_service import (
    send_appointment_cancellation,
    send_appointment_confirmation,
    send_appointment_reminder,
    send_email,
)
from apps.notifications.services.reminder_scheduler import schedule_pending_reminders
from apps.scheduling.models import Appointment
from tests.factories.notifications import NotificationPreferenceFactory
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import UserFactory


# ---------------------------------------------------------------------------
# send_email
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendEmail:
    def test_dev_mode_logs_as_queued_without_sending(self, settings):
        """When RESEND_API_KEY is empty, email is logged as QUEUED."""
        settings.RESEND_API_KEY = ""
        log = send_email(
            to="test@example.com",
            subject="Hello",
            html_body="<p>Body</p>",
        )
        assert log.status == EmailLog.QUEUED
        assert log.recipient_email == "test@example.com"
        assert log.pk is not None

    def test_successful_send_logs_as_sent(self, settings):
        """When Resend succeeds, log status is SENT with external_id."""
        settings.RESEND_API_KEY = "re_test_key"
        mock_response = {"id": "resend-msg-id-123"}
        with patch("resend.Emails.send", return_value=mock_response):
            log = send_email(
                to="user@example.com",
                subject="Confirm",
                html_body="<p>Hi</p>",
            )
        assert log.status == EmailLog.SENT
        assert log.external_id == "resend-msg-id-123"
        assert log.sent_at is not None

    def test_failed_send_logs_as_failed(self, settings):
        """When Resend raises an exception, log status is FAILED."""
        settings.RESEND_API_KEY = "re_test_key"
        with patch("resend.Emails.send", side_effect=Exception("API error")):
            log = send_email(
                to="fail@example.com",
                subject="Fail",
                html_body="<p>Fail</p>",
            )
        assert log.status == EmailLog.FAILED
        assert "API error" in log.error_message

    def test_body_preview_truncated_to_500_chars(self, settings):
        settings.RESEND_API_KEY = ""
        long_body = "x" * 1000
        log = send_email(to="a@b.com", subject="s", html_body=long_body)
        assert len(log.body_preview) <= 500


# ---------------------------------------------------------------------------
# send_appointment_reminder
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendAppointmentReminder:
    def test_creates_notification_for_tutor(self, settings):
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)

        send_appointment_reminder(appointment)

        assert Notification.objects.filter(
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_REMINDER,
            related_type="Appointment",
            related_id=appointment.pk,
        ).exists()

    def test_sends_email_to_tutor(self, settings):
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)

        send_appointment_reminder(appointment)

        assert EmailLog.objects.filter(recipient_email=tutor.email).exists()

    def test_updates_reminder_sent_at(self, settings):
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient, reminder_sent_at=None)

        send_appointment_reminder(appointment)

        appointment.refresh_from_db()
        assert appointment.reminder_sent_at is not None

    def test_respects_notification_preference_disabled(self, settings):
        """When the tutor opted out of reminders, no email is sent."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient)
        NotificationPreferenceFactory(
            user=tutor,
            practice=practice,
            email_appointment_reminder=False,
        )

        send_appointment_reminder(appointment)

        assert not EmailLog.objects.filter(recipient_email=tutor.email).exists()
        assert not Notification.objects.filter(recipient=tutor).exists()

    def test_no_reminder_sent_at_when_no_tutors(self, settings):
        """When there are no tutors, reminder_sent_at stays None."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient, reminder_sent_at=None)

        send_appointment_reminder(appointment)

        appointment.refresh_from_db()
        assert appointment.reminder_sent_at is None


# ---------------------------------------------------------------------------
# send_appointment_confirmation / cancellation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendAppointmentConfirmation:
    def test_creates_confirmed_notification(self, settings):
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient, status=Appointment.CONFIRMED)

        send_appointment_confirmation(appointment)

        assert Notification.objects.filter(
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_CONFIRMED,
        ).exists()


@pytest.mark.django_db
class TestSendAppointmentCancellation:
    def test_creates_cancelled_notification(self, settings):
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        appointment = AppointmentFactory(practice=practice, patient=patient, status=Appointment.CANCELLED)

        send_appointment_cancellation(appointment)

        assert Notification.objects.filter(
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_CANCELLED,
        ).exists()


# ---------------------------------------------------------------------------
# schedule_pending_reminders
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSchedulePendingReminders:
    def test_returns_count_of_dispatched_reminders(self, settings):
        """Confirmed appointments in window are reminded; count is returned."""
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        # Appointment in the past (already past reminder window)
        past_date = timezone.now().date() - datetime.timedelta(days=1)
        AppointmentFactory(
            practice=practice,
            patient=patient,
            status=Appointment.CONFIRMED,
            scheduled_date=past_date,
            reminder_sent_at=None,
        )

        # Appointment today — within the default 24 h window
        today = timezone.now().date()
        appt = AppointmentFactory(
            practice=practice,
            patient=patient,
            status=Appointment.CONFIRMED,
            scheduled_date=today,
            reminder_sent_at=None,
        )

        count = schedule_pending_reminders()
        assert count >= 1

        appt.refresh_from_db()
        assert appt.reminder_sent_at is not None

    def test_already_reminded_appointments_skipped(self, settings):
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        already_reminded = AppointmentFactory(
            practice=practice,
            patient=patient,
            status=Appointment.CONFIRMED,
            scheduled_date=timezone.now().date(),
            reminder_sent_at=timezone.now(),
        )

        initial_email_count = EmailLog.objects.count()
        schedule_pending_reminders()
        assert EmailLog.objects.count() == initial_email_count

    def test_pending_status_appointments_skipped(self, settings):
        settings.RESEND_API_KEY = ""
        practice = PracticeFactory()
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        AppointmentFactory(
            practice=practice,
            patient=patient,
            status=Appointment.PENDING,
            scheduled_date=timezone.now().date(),
            reminder_sent_at=None,
        )

        count = schedule_pending_reminders()
        assert count == 0
