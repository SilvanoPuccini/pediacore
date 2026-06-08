"""
Django admin configuration for the patients app.
"""

from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from apps.patients.models import Patient, PatientFile, TutorPatient


class TutorPatientInline(TabularInline):
    model = TutorPatient
    extra = 0
    fields = ("tutor", "relationship", "is_primary")
    autocomplete_fields = ["tutor"]
    verbose_name = "Tutor"
    verbose_name_plural = "Tutors"


class PatientFileInline(TabularInline):
    model = PatientFile
    extra = 0
    fields = ("file_type", "original_filename", "file_size", "description", "uploaded_by")
    readonly_fields = ("original_filename", "file_size", "uploaded_by")
    verbose_name = "File"
    verbose_name_plural = "Files"


@admin.register(Patient)
class PatientAdmin(ModelAdmin):
    list_display = ("full_name", "date_of_birth", "sex_at_birth", "is_active", "practice")
    list_filter = ("sex_at_birth", "is_active", "practice")
    search_fields = ("first_name", "last_name", "rut")
    list_select_related = ["practice"]
    date_hierarchy = "date_of_birth"
    readonly_fields = ("created_at", "updated_at", "deleted_at")
    inlines = [TutorPatientInline, PatientFileInline]
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


@admin.register(PatientFile)
class PatientFileAdmin(ModelAdmin):
    list_display = ("original_filename", "patient", "file_type", "file_size", "uploaded_by", "created_at")
    list_filter = ("file_type",)
    search_fields = ("original_filename", "patient__first_name", "patient__last_name")
    list_select_related = ["patient", "uploaded_by"]
    readonly_fields = ("original_filename", "file_size", "created_at")
