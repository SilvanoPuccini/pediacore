from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.notifications.models import (
    EmailLog,
    Notification,
    NotificationPreference,
    NotificationTemplate,
)


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
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
    list_select_related = ["recipient"]
    readonly_fields = ["created_at", "updated_at", "deleted_at", "read_at"]
    fieldsets = [
        (None, {"fields": ["practice", "recipient", "notification_type", "title", "message"]}),
        ("Read status", {"fields": ["is_read", "read_at"]}),
        ("Related object", {"fields": ["related_type", "related_id"], "classes": ["collapse"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(EmailLog)
class EmailLogAdmin(ModelAdmin):
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

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(ModelAdmin):
    list_display = ["name", "event_type", "subject", "is_active", "updated_at"]
    list_filter = ["event_type", "is_active", "practice"]
    search_fields = ["name", "subject", "body"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["practice", "name", "event_type", "is_active"]}),
        ("Content", {"fields": ["subject", "body"]}),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at", "deleted_at"],
                "classes": ["collapse"],
            },
        ),
    ]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(ModelAdmin):
    list_display = [
        "user",
        "practice",
        "email_appointment_reminder",
        "email_appointment_confirmed",
        "email_appointment_cancelled",
    ]
    list_filter = [
        "practice",
        "email_appointment_reminder",
        "email_appointment_confirmed",
        "email_appointment_cancelled",
    ]
    search_fields = ["user__email"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
