"""
Django admin configuration for the patients app.
"""

from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline

from apps.core.admin_actions import export_to_xlsx
from apps.patients.models import CoResponsible, Patient, PatientFile, TutorPatient


class LocationFilter(SimpleListFilter):
    title = "Sede"
    parameter_name = "location"

    def lookups(self, request, model_admin):
        from apps.practice.models import Location
        return [(loc.pk, loc.name) for loc in Location.objects.filter(is_active=True)]

    def queryset(self, request, queryset):
        if self.value():
            patient_ids = (
                Patient.objects.filter(
                    tutor_patients__deleted_at__isnull=True,
                )
                .filter(appointments__location_id=self.value())
                .values_list("pk", flat=True)
                .distinct()
            )
            return queryset.filter(pk__in=patient_ids)
        return queryset


class TutorPatientInline(TabularInline):
    model = TutorPatient
    extra = 0
    fields = ("tutor", "relationship", "is_primary")
    autocomplete_fields = ["tutor"]
    verbose_name = "Tutor"
    verbose_name_plural = "Tutors"


class PatientFileInline(TabularInline):
    model = PatientFile
    extra = 3  # Show 3 empty upload slots by default
    fields = ("file_type", "original_filename", "file_size", "description", "uploaded_by")
    readonly_fields = ("original_filename", "file_size", "uploaded_by")
    verbose_name = "File"
    verbose_name_plural = "Files"


@admin.register(Patient)
class PatientAdmin(ModelAdmin):
    list_display = ("full_name", "date_of_birth", "sex_at_birth", "is_active", "practice", "growth_chart_link")
    list_filter = ("sex_at_birth", "is_active", "practice", LocationFilter)
    search_fields = ("first_name", "last_name", "rut")
    list_select_related = ["practice"]
    date_hierarchy = "date_of_birth"
    readonly_fields = ("created_at", "updated_at", "deleted_at")
    actions = [export_to_xlsx]
    inlines = [TutorPatientInline, PatientFileInline]

    def growth_chart_link(self, obj):
        return format_html(
            '<a href="/admin/patients/{}/growth-chart/" class="text-primary-500 hover:underline">Ver curva</a>',
            obj.pk,
        )
    growth_chart_link.short_description = "Crecimiento"
    fieldsets = (
        (
            "Identity",
            {
                "fields": (
                    "practice",
                    "first_name",
                    "last_name",
                    "date_of_birth",
                    "sex_at_birth",
                    "rut",
                    "photo",
                    "is_active",
                )
            },
        ),
        (
            "Clinical",
            {
                "fields": ("blood_type", "allergies", "chronic_conditions", "notes"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at", "deleted_at"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(TutorPatient)
class TutorPatientAdmin(ModelAdmin):
    list_display = ("tutor", "patient", "relationship", "is_primary")
    list_filter = ("relationship", "is_primary")
    search_fields = ("tutor__email", "patient__first_name", "patient__last_name")
    raw_id_fields = ("tutor", "patient")


@admin.register(CoResponsible)
class CoResponsibleAdmin(ModelAdmin):
    list_display = ["name", "tutor", "relationship", "phone", "can_book"]
    list_filter = ["relationship", "can_book"]
    search_fields = ["name", "rut", "tutor__email"]
    list_select_related = ["tutor"]


@admin.register(PatientFile)
class PatientFileAdmin(ModelAdmin):
    list_display = ("original_filename", "patient", "file_type", "file_size", "uploaded_by", "created_at")
    list_filter = ("file_type",)
    search_fields = ("original_filename", "patient__first_name", "patient__last_name")
    list_select_related = ["patient", "uploaded_by"]
    readonly_fields = ("original_filename", "file_size", "created_at")
