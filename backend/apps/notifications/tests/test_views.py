"""
Tests for notifications views.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.notifications.models import Notification, NotificationPreference
from tests.factories.notifications import (
    EmailLogFactory,
    NotificationFactory,
    NotificationPreferenceFactory,
)
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory, UserFactory

User = get_user_model()


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
# Notification list/detail
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNotificationList:
    def test_user_sees_own_notifications(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        NotificationFactory(recipient=tutor, practice=practice)
        NotificationFactory(recipient=tutor, practice=practice)
        url = reverse("notifications:notification-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_tutor_cannot_see_others_notifications(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        other_user = UserFactory(email="other@example.com")
        NotificationFactory(recipient=other_user, practice=practice)
        url = reverse("notifications:notification-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

    def test_anon_cannot_list_notifications(self, api_client):
        url = reverse("notifications:notification-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMarkNotificationRead:
    def test_mark_single_notification_as_read(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        notif = NotificationFactory(recipient=tutor, practice=practice, is_read=False)
        url = reverse("notifications:notification-mark-read", kwargs={"pk": notif.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_read"] is True
        assert response.data["read_at"] is not None

    def test_user_cannot_mark_others_notification_read(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        other = UserFactory(email="other2@example.com")
        notif = NotificationFactory(recipient=other, practice=practice, is_read=False)
        url = reverse("notifications:notification-mark-read", kwargs={"pk": notif.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMarkAllRead:
    def test_mark_all_read(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        NotificationFactory(recipient=tutor, practice=practice, is_read=False)
        NotificationFactory(recipient=tutor, practice=practice, is_read=False)
        url = reverse("notifications:notification-mark-all-read")
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["marked_read"] == 2
        assert Notification.objects.filter(recipient=tutor, is_read=False).count() == 0


@pytest.mark.django_db
class TestUnreadCount:
    def test_unread_count_returns_correct_number(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        NotificationFactory(recipient=tutor, practice=practice, is_read=False)
        NotificationFactory(recipient=tutor, practice=practice, is_read=False)
        NotificationFactory(recipient=tutor, practice=practice, is_read=True)
        url = reverse("notifications:notification-unread-count")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 2

    def test_unread_count_zero_when_none(self, tutor_client):
        client, tutor = tutor_client
        url = reverse("notifications:notification-unread-count")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["unread_count"] == 0


# ---------------------------------------------------------------------------
# Notification preferences
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNotificationPreferences:
    def test_get_preferences_auto_creates(self, tutor_client):
        client, tutor = tutor_client
        PracticeFactory()
        url = reverse("notifications:notification-preferences")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email_appointment_reminder"] is True

    def test_update_preferences(self, tutor_client):
        client, tutor = tutor_client
        practice = PracticeFactory()
        NotificationPreferenceFactory(user=tutor, practice=practice)
        url = reverse("notifications:notification-preferences")
        payload = {
            "email_appointment_reminder": False,
            "email_appointment_confirmed": True,
            "email_appointment_cancelled": True,
            "email_waitlist_available": False,
            "email_payment_received": True,
        }
        response = client.put(url, data=payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email_appointment_reminder"] is False

    def test_anon_cannot_get_preferences(self, api_client):
        url = reverse("notifications:notification-preferences")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Email logs (doctor only)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEmailLogs:
    def test_doctor_can_list_email_logs(self, doctor_client):
        client, doctor = doctor_client
        EmailLogFactory()
        EmailLogFactory()
        url = reverse("notifications:admin-email-logs-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_tutor_cannot_access_email_logs(self, tutor_client):
        client, tutor = tutor_client
        url = reverse("notifications:admin-email-logs-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anon_cannot_access_email_logs(self, api_client):
        url = reverse("notifications:admin-email-logs-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Manual send notification (doctor only)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSendNotification:
    def test_doctor_can_send_notification(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        recipient = UserFactory(email="recipient@example.com")
        url = reverse("notifications:admin-send-notification")
        payload = {
            "recipient_id": recipient.pk,
            "notification_type": Notification.GENERAL,
            "title": "Test notification",
            "message": "This is a test message",
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Test notification"
        assert Notification.objects.filter(recipient=recipient).count() == 1

    def test_tutor_cannot_send_notification(self, tutor_client):
        client, tutor = tutor_client
        url = reverse("notifications:admin-send-notification")
        payload = {
            "recipient_id": tutor.pk,
            "notification_type": Notification.GENERAL,
            "title": "Unauthorized",
            "message": "Should fail",
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_send_notification_invalid_recipient(self, doctor_client):
        client, doctor = doctor_client
        PracticeFactory(owner=doctor)
        url = reverse("notifications:admin-send-notification")
        payload = {
            "recipient_id": 99999,
            "notification_type": Notification.GENERAL,
            "title": "Test",
            "message": "Test",
        }
        response = client.post(url, data=payload, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND
