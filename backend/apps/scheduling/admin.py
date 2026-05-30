from __future__ import annotations

from django.contrib import admin

from apps.scheduling.models import (
    Appointment,
    AppointmentToken,
    AutoResponderConfig,
    CancellationPolicy,
    CancellationTier,
    WaitlistEntry,
)


class CancellationTierInline(admin.TabularInline):
    model = CancellationTier
    extra = 1
    fields = ["min_hours_before", "penalty_percentage", "description"]


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        "patient",
        "service",
        "location",
        "scheduled_date",
        "start_time",
        "end_time",
        "status",
        "is_online",
        "created_at",
    ]
    list_filter = ["status", "is_online", "location", "scheduled_date"]
    search_fields = ["patient__first_name", "patient__last_name", "notes"]
    readonly_fields = ["end_time", "created_at", "updated_at", "deleted_at", "cancelled_at", "confirmed_at"]
    date_hierarchy = "scheduled_date"
    fieldsets = [
        (None, {"fields": ["practice", "patient", "service", "location", "doctor", "booked_by"]}),
        ("Schedule", {"fields": ["scheduled_date", "start_time", "end_time", "is_online"]}),
        ("Status", {"fields": ["status", "notes"]}),
        ("Cancellation", {"fields": ["cancellation_reason", "cancelled_at"], "classes": ["collapse"]}),
        ("Timestamps", {"fields": ["confirmed_at", "reminder_sent_at", "created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ["patient", "service", "location", "status", "preferred_date_start", "created_at"]
    list_filter = ["status", "location"]
    search_fields = ["patient__first_name", "patient__last_name"]
    readonly_fields = ["created_at", "updated_at", "deleted_at", "notified_at"]


@admin.register(CancellationPolicy)
class CancellationPolicyAdmin(admin.ModelAdmin):
    list_display = ["practice", "is_active", "created_at"]
    list_filter = ["is_active"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    inlines = [CancellationTierInline]


@admin.register(CancellationTier)
class CancellationTierAdmin(admin.ModelAdmin):
    list_display = ["policy", "min_hours_before", "penalty_percentage", "description"]
    list_filter = ["policy"]
    ordering = ["-min_hours_before"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(AppointmentToken)
class AppointmentTokenAdmin(admin.ModelAdmin):
    list_display = ["appointment", "action", "expires_at", "used_at", "created_at"]
    list_filter = ["action"]
    search_fields = ["token", "appointment__patient__first_name", "appointment__patient__last_name"]
    readonly_fields = ["token", "created_at", "updated_at", "used_at"]


@admin.register(AutoResponderConfig)
class AutoResponderConfigAdmin(admin.ModelAdmin):
    list_display = ["practice", "is_active", "created_at"]
    list_filter = ["is_active"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
