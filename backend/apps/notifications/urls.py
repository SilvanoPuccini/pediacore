from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.notifications.views import (
    EmailLogViewSet,
    NotificationPreferenceView,
    NotificationViewSet,
    SendNotificationView,
)

app_name = "notifications"

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"admin/email-logs", EmailLogViewSet, basename="admin-email-logs")

urlpatterns = [
    path("notification-preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("admin/notifications/send/", SendNotificationView.as_view(), name="admin-send-notification"),
    path("", include(router.urls)),
]
