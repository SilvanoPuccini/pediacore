"""
Django admin configuration for the practice app.
"""

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.practice.models import BlockedSlot, Location, Practice, Service, WorkingHours


class LocationInline(TabularInline):
    model = Location
    extra = 1
    fields = ["name", "slug", "city", "address", "phone", "is_active"]
    prepopulated_fields = {"slug": ("name",)}
    show_change_link = True


@admin.register(Practice)
class PracticeAdmin(ModelAdmin):
    list_display = ["name", "slug", "email", "phone", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "email"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    inlines = [LocationInline]
    fieldsets = [
        (None, {"fields": ["name", "slug", "description", "logo", "owner"]}),
        ("Contact", {"fields": ["email", "phone", "website"]}),
        ("Bank Account", {
            "fields": ["bank_name", "account_type", "account_number", "account_holder", "account_rut", "account_email"],
            "description": "Bank account details shown to tutors when paying by transfer.",
        }),
        ("Status", {"fields": ["is_active"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(Location)
class LocationAdmin(ModelAdmin):
    list_display = ["name", "practice", "city", "region", "is_active", "created_at"]
    list_filter = ["is_active", "practice", "city"]
    search_fields = ["name", "city", "address"]
    prepopulated_fields = {"slug": ("name",)}
    list_select_related = ["practice"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["practice", "name", "slug"]}),
        ("Address", {"fields": ["address", "city", "region"]}),
        ("Contact", {"fields": ["phone", "email"]}),
        ("Coordinates", {"fields": ["latitude", "longitude"], "classes": ["collapse"]}),
        ("Status", {"fields": ["is_active"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(Service)
class ServiceAdmin(ModelAdmin):
    list_display = ["name", "practice", "duration_minutes", "price_clp", "modality", "display_order", "is_active"]
    list_filter = ["is_active", "modality", "practice"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ["locations"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["practice", "name", "slug", "description"]}),
        ("Details", {"fields": ["duration_minutes", "price_clp", "modality", "display_order"]}),
        ("Booking flags", {"fields": ["requires_fonasa_validation", "requires_manual_coordination"]}),
        ("Locations", {"fields": ["locations"]}),
        ("Status", {"fields": ["is_active"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(WorkingHours)
class WorkingHoursAdmin(ModelAdmin):
    actions = ["bulk_duplicate_weekdays"]

    @admin.action(description="Duplicar horario a todos los días de semana")
    def bulk_duplicate_weekdays(self, request, queryset):
        """Duplicate selected working hours to all weekdays (Mon-Fri)."""
        created = 0
        for wh in queryset:
            for day in range(0, 5):  # Monday=0 to Friday=4
                if day == wh.day_of_week:
                    continue
                exists = WorkingHours.objects.filter(
                    practice=wh.practice,
                    location=wh.location,
                    day_of_week=day,
                    start_time=wh.start_time,
                    end_time=wh.end_time,
                    service=wh.service,
                ).exists()
                if not exists:
                    WorkingHours.objects.create(
                        practice=wh.practice,
                        location=wh.location,
                        day_of_week=day,
                        start_time=wh.start_time,
                        end_time=wh.end_time,
                        break_start=wh.break_start,
                        break_end=wh.break_end,
                        max_appointments=wh.max_appointments,
                        slot_duration_minutes=wh.slot_duration_minutes,
                        is_online=wh.is_online,
                        service=wh.service,
                        is_active=wh.is_active,
                    )
                    created += 1
        self.message_user(request, f"{created} horario(s) creado(s) en los días de semana.")

    list_display = [
        "location",
        "practice",
        "day_of_week",
        "start_time",
        "end_time",
        "break_start",
        "break_end",
        "max_appointments",
        "slot_duration_minutes",
        "is_online",
        "service",
        "is_active",
    ]
    list_filter = ["is_active", "is_online", "practice", "location", "day_of_week", "service"]
    list_editable = [
        "break_start",
        "break_end",
        "max_appointments",
        "slot_duration_minutes",
    ]
    list_select_related = ["location", "practice"]
    ordering = ["location", "day_of_week", "start_time"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = [
        (None, {
            "fields": ["practice", "location", "day_of_week", "is_online", "service"],
        }),
        ("Time range", {
            "fields": ["start_time", "end_time"],
        }),
        ("Break window", {
            "fields": ["break_start", "break_end"],
            "classes": ["collapse"],
            "description": "Optional lunch/break window. Both fields must be set together.",
        }),
        ("Capacity", {
            "fields": ["max_appointments", "slot_duration_minutes"],
        }),
        ("Status", {
            "fields": ["is_active"],
        }),
        ("Timestamps", {
            "fields": ["created_at", "updated_at"],
            "classes": ["collapse"],
        }),
    ]


@admin.register(BlockedSlot)
class BlockedSlotAdmin(ModelAdmin):
    list_display = ["practice", "location", "start_datetime", "end_datetime", "reason"]
    list_filter = ["practice", "location"]
    search_fields = ["reason"]
    date_hierarchy = "start_datetime"
    ordering = ["-start_datetime"]
    readonly_fields = ["created_at", "updated_at"]
