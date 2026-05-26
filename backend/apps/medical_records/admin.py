"""
Django admin configuration for the medical_records app.
"""

from django.contrib import admin

from apps.medical_records.models import (
    Anthropometry,
    Diagnosis,
    Encounter,
    PhysicalExam,
    SOAPNote,
    VitalSigns,
)


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------


class SOAPNoteInline(admin.StackedInline):
    model = SOAPNote
    extra = 0
    can_delete = False
    fields = ("subjective", "objective", "assessment", "plan")
    verbose_name = "SOAP Note"


class PhysicalExamInline(admin.StackedInline):
    model = PhysicalExam
    extra = 0
    can_delete = False
    fields = (
        "general_appearance",
        "skin",
        "head_neck",
        "eyes",
        "ears_nose_throat",
        "respiratory",
        "cardiovascular",
        "abdomen",
        "genitourinary",
        "musculoskeletal",
        "neurological",
        "lymph_nodes",
        "additional_findings",
    )
    verbose_name = "Physical Exam"


class VitalSignsInline(admin.TabularInline):
    model = VitalSigns
    extra = 0
    can_delete = False
    fields = (
        "temperature",
        "heart_rate",
        "respiratory_rate",
        "blood_pressure_systolic",
        "blood_pressure_diastolic",
        "oxygen_saturation",
    )
    verbose_name = "Vital Signs"


class AnthropometryInline(admin.TabularInline):
    model = Anthropometry
    extra = 0
    can_delete = False
    fields = (
        "weight_kg",
        "height_cm",
        "head_circumference_cm",
        "bmi",
        "weight_for_age_z",
        "height_for_age_z",
        "weight_for_age_percentile",
        "height_for_age_percentile",
    )
    readonly_fields = (
        "bmi",
        "weight_for_age_z",
        "height_for_age_z",
        "head_circumference_for_age_z",
        "bmi_for_age_z",
        "weight_for_height_z",
        "weight_for_age_percentile",
        "height_for_age_percentile",
        "head_circumference_for_age_percentile",
        "bmi_for_age_percentile",
        "weight_for_height_percentile",
    )
    verbose_name = "Anthropometry"


# ---------------------------------------------------------------------------
# EncounterAdmin
# ---------------------------------------------------------------------------


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = (
        "patient",
        "encounter_type",
        "status",
        "doctor",
        "location",
        "scheduled_at",
        "created_at",
    )
    list_filter = ("encounter_type", "status", "practice", "location")
    search_fields = ("patient__first_name", "patient__last_name", "reason_for_visit")
    raw_id_fields = ("patient", "doctor", "practice", "location")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    inlines = [SOAPNoteInline, PhysicalExamInline, VitalSignsInline, AnthropometryInline]

    fieldsets = (
        (
            "Encounter",
            {
                "fields": (
                    "practice",
                    "patient",
                    "doctor",
                    "location",
                    "encounter_type",
                    "status",
                )
            },
        ),
        (
            "Timing",
            {
                "fields": ("scheduled_at", "started_at", "completed_at"),
            },
        ),
        (
            "Clinical",
            {
                "fields": ("reason_for_visit",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


# ---------------------------------------------------------------------------
# DiagnosisAdmin
# ---------------------------------------------------------------------------


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = ("description", "code", "is_primary", "encounter", "created_at")
    list_filter = ("is_primary", "practice")
    search_fields = ("description", "code", "encounter__patient__first_name", "encounter__patient__last_name")
    raw_id_fields = ("encounter", "practice")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
