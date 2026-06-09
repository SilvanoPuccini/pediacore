from __future__ import annotations

from django.contrib import admin
from django.utils import timezone
from unfold.admin import ModelAdmin, TabularInline

from apps.core.admin_actions import export_to_xlsx, send_reminder_email
from apps.scheduling.models import (
    Appointment,
    AppointmentToken,
    AutoResponderConfig,
    CancellationPolicy,
    CancellationTier,
    WaitlistEntry,
)


class CancellationTierInline(TabularInline):
    model = CancellationTier
    extra = 1
    fields = ["min_hours_before", "penalty_percentage", "description"]


@admin.register(Appointment)
class AppointmentAdmin(ModelAdmin):
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
    list_select_related = ["patient", "service", "location"]
    readonly_fields = ["end_time", "created_at", "updated_at", "deleted_at", "cancelled_at", "confirmed_at"]
    date_hierarchy = "scheduled_date"
    actions = [export_to_xlsx, send_reminder_email, "confirm_appointments", "cancel_appointments"]
    fieldsets = [
        (None, {"fields": ["practice", "patient", "service", "location", "doctor", "booked_by"]}),
        ("Schedule", {"fields": ["scheduled_date", "start_time", "end_time", "is_online"]}),
        ("Status", {"fields": ["status", "notes"]}),
        ("Cancellation", {"fields": ["cancellation_reason", "cancelled_at"], "classes": ["collapse"]}),
        ("Timestamps", {"fields": ["confirmed_at", "reminder_sent_at", "created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]

    @admin.action(description="Confirmar turnos seleccionados")
    def confirm_appointments(self, request, queryset):
        updated = queryset.filter(status="PENDING").update(status="CONFIRMED")
        self.message_user(request, f"{updated} turno(s) confirmado(s).")

    @admin.action(description="Cancelar turnos seleccionados")
    def cancel_appointments(self, request, queryset):
        updated = queryset.exclude(status__in=["CANCELLED", "COMPLETED"]).update(
            status="CANCELLED", cancelled_at=timezone.now()
        )
        self.message_user(request, f"{updated} turno(s) cancelado(s).")


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(ModelAdmin):
    list_display = ["patient", "service", "location", "status", "preferred_date_start", "created_at"]
    list_filter = ["status", "location"]
    search_fields = ["patient__first_name", "patient__last_name"]
    date_hierarchy = "created_at"
    readonly_fields = ["created_at", "updated_at", "deleted_at", "notified_at"]


@admin.register(CancellationPolicy)
class CancellationPolicyAdmin(ModelAdmin):
    list_display = ["practice", "is_active", "created_at"]
    list_filter = ["is_active"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    inlines = [CancellationTierInline]


@admin.register(CancellationTier)
class CancellationTierAdmin(ModelAdmin):
    list_display = ["policy", "min_hours_before", "penalty_percentage", "description"]
    list_filter = ["policy"]
    ordering = ["-min_hours_before"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(AppointmentToken)
class AppointmentTokenAdmin(ModelAdmin):
    list_display = ["appointment", "token", "action", "expires_at", "used_at", "created_at"]
    list_filter = ["action"]
    search_fields = ["token", "appointment__patient__first_name", "appointment__patient__last_name"]
    readonly_fields = ["token", "created_at", "updated_at", "used_at"]


@admin.register(AutoResponderConfig)
class AutoResponderConfigAdmin(ModelAdmin):
    list_display = ["practice", "is_active", "created_at"]
    list_filter = ["is_active"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
