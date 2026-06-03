"""
Serializers for the notifications app.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.notifications.models import EmailLog, Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing and retrieving notifications."""

    notification_type_display = serializers.CharField(
        source="get_notification_type_display", read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "notification_type_display",
            "title",
            "message",
            "is_read",
            "read_at",
            "related_type",
            "related_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for reading and updating notification preferences."""

    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "email_appointment_reminder",
            "email_appointment_confirmed",
            "email_appointment_cancelled",
            "email_waitlist_available",
            "email_payment_received",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EmailLogSerializer(serializers.ModelSerializer):
    """Read-only serializer for email logs (doctor/admin access)."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = EmailLog
        fields = [
            "id",
            "recipient_email",
            "subject",
            "body_preview",
            "status",
            "status_display",
            "provider",
            "external_id",
            "error_message",
            "sent_at",
            "created_at",
        ]
        read_only_fields = fields


class SendNotificationSerializer(serializers.Serializer):
    """Input serializer for the manual send-notification admin action."""

    recipient_id = serializers.IntegerField()
    notification_type = serializers.ChoiceField(choices=Notification.NOTIFICATION_TYPE_CHOICES)
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    related_type = serializers.CharField(max_length=50, required=False, default="")
    related_id = serializers.IntegerField(required=False, allow_null=True, default=None)
