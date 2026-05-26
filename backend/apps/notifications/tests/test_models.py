"""
Tests for notifications models.
"""

from __future__ import annotations

import pytest
from django.utils import timezone

from apps.notifications.models import EmailLog, Notification, NotificationPreference
from tests.factories.notifications import (
    EmailLogFactory,
    NotificationFactory,
    NotificationPreferenceFactory,
)


@pytest.mark.django_db
class TestNotificationModel:
    def test_create_notification(self):
        notif = NotificationFactory()
        assert notif.pk is not None
        assert notif.is_read is False
        assert notif.read_at is None

    def test_notification_str(self):
        notif = NotificationFactory(title="Test title")
        result = str(notif)
        assert notif.recipient.email in result
        assert "Test title" in result

    def test_notification_defaults(self):
        notif = NotificationFactory()
        assert notif.notification_type == Notification.GENERAL
        assert notif.is_read is False
        assert notif.related_type == ""
        assert notif.related_id is None

    def test_mark_as_read_sets_flag(self):
        notif = NotificationFactory(is_read=False)
        notif.mark_as_read()
        assert notif.is_read is True
        assert notif.read_at is not None

    def test_mark_as_read_persists_to_db(self):
        notif = NotificationFactory(is_read=False)
        notif.mark_as_read()
        refreshed = Notification.objects.get(pk=notif.pk)
        assert refreshed.is_read is True
        assert refreshed.read_at is not None

    def test_mark_as_read_idempotent(self):
        notif = NotificationFactory(is_read=True, read_at=timezone.now())
        original_read_at = notif.read_at
        notif.mark_as_read()
        # Should not update read_at again if already read
        assert notif.read_at == original_read_at

    def test_notification_soft_delete(self):
        notif = NotificationFactory()
        pk = notif.pk
        notif.delete()
        assert notif.deleted_at is not None
        assert not Notification.objects.filter(pk=pk).exists()
        assert Notification.objects.all_with_deleted().filter(pk=pk).exists()

    def test_notification_type_choices(self):
        types = [choice[0] for choice in Notification.NOTIFICATION_TYPE_CHOICES]
        assert Notification.APPOINTMENT_REMINDER in types
        assert Notification.APPOINTMENT_CONFIRMED in types
        assert Notification.APPOINTMENT_CANCELLED in types
        assert Notification.WAITLIST_AVAILABLE in types
        assert Notification.PAYMENT_RECEIVED in types
        assert Notification.GENERAL in types

    def test_notification_with_related_object(self):
        notif = NotificationFactory(related_type="Appointment", related_id=42)
        assert notif.related_type == "Appointment"
        assert notif.related_id == 42


@pytest.mark.django_db
class TestEmailLogModel:
    def test_create_email_log(self):
        log = EmailLogFactory()
        assert log.pk is not None
        assert log.status == EmailLog.QUEUED

    def test_email_log_str(self):
        log = EmailLogFactory(subject="Test subject")
        result = str(log)
        assert log.recipient_email in result
        assert "Test subject" in result

    def test_email_log_defaults(self):
        log = EmailLogFactory()
        assert log.provider == "resend"
        assert log.external_id == ""
        assert log.error_message == ""
        assert log.sent_at is None

    def test_email_log_has_no_soft_delete(self):
        """EmailLog uses TimeStampedModel — no deleted_at field."""
        log = EmailLogFactory()
        assert not hasattr(log, "deleted_at")

    def test_email_log_status_choices(self):
        statuses = [c[0] for c in EmailLog.STATUS_CHOICES]
        assert EmailLog.QUEUED in statuses
        assert EmailLog.SENT in statuses
        assert EmailLog.FAILED in statuses


@pytest.mark.django_db
class TestNotificationPreferenceModel:
    def test_create_preference(self):
        pref = NotificationPreferenceFactory()
        assert pref.pk is not None

    def test_preference_defaults(self):
        pref = NotificationPreferenceFactory()
        assert pref.email_appointment_reminder is True
        assert pref.email_appointment_confirmed is True
        assert pref.email_appointment_cancelled is True
        assert pref.email_waitlist_available is True
        assert pref.email_payment_received is True
        assert pref.reminder_hours_before == 24

    def test_preference_str(self):
        pref = NotificationPreferenceFactory()
        result = str(pref)
        assert pref.user.email in result

    def test_preference_one_to_one_user(self):
        pref = NotificationPreferenceFactory()
        assert pref.user.notification_preferences == pref
