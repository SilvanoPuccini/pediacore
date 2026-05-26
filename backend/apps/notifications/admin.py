from __future__ import annotations

from django.contrib import admin

from apps.notifications.models import EmailLog, Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "recipient",
        "notification_type",
        "title",
        "is_read",
        "read_at",
        "created_at",
    ]
    list_filter = ["notification_type", "is_read", "practice"]
    search_fields = ["recipient__email", "title", "message"]
    readonly_fields = ["created_at", "updated_at", "deleted_at", "read_at"]
    fieldsets = [
        (None, {"fields": ["practice", "recipient", "notification_type", "title", "message"]}),
        ("Read status", {"fields": ["is_read", "read_at"]}),
        ("Related object", {"fields": ["related_type", "related_id"], "classes": ["collapse"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = [
        "recipient_email",
        "subject",
        "status",
        "provider",
        "sent_at",
        "created_at",
    ]
    list_filter = ["status", "provider", "practice"]
    search_fields = ["recipient_email", "subject", "external_id"]
    readonly_fields = ["created_at", "updated_at", "sent_at", "external_id"]
    date_hierarchy = "created_at"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "practice",
        "email_appointment_reminder",
        "email_appointment_confirmed",
        "email_appointment_cancelled",
        "reminder_hours_before",
    ]
    list_filter = ["practice", "email_appointment_reminder"]
    search_fields = ["user__email"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
