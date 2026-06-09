"""
Django admin configuration for the medical_records app.
"""

from django.contrib import admin
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from apps.medical_records.models import (
    Anthropometry,
    Diagnosis,
    DiagnosisCatalog,
    Encounter,
    EncounterTemplate,
    PhysicalExam,
    SOAPNote,
    Vaccination,
    VaccineSchedule,
    VitalSigns,
)


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------


class SOAPNoteInline(StackedInline):
    model = SOAPNote
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ("subjective", "objective", "assessment", "plan")
    verbose_name = "SOAP Note"


class PhysicalExamInline(StackedInline):
    model = PhysicalExam
    extra = 0
    can_delete = False
    show_change_link = True
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


class VitalSignsInline(TabularInline):
    model = VitalSigns
    extra = 0
    can_delete = False
    show_change_link = True
    fields = (
        "temperature",
        "heart_rate",
        "respiratory_rate",
        "blood_pressure_systolic",
        "blood_pressure_diastolic",
        "oxygen_saturation",
    )
    verbose_name = "Vital Signs"


class AnthropometryInline(TabularInline):
    model = Anthropometry
    extra = 0
    can_delete = False
    show_change_link = True
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
class EncounterAdmin(ModelAdmin):
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
    autocomplete_fields = ["patient", "doctor", "practice", "location"]
    list_select_related = ["patient", "doctor", "location"]
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
# EncounterTemplateAdmin
# ---------------------------------------------------------------------------


@admin.register(EncounterTemplate)
class EncounterTemplateAdmin(ModelAdmin):
    list_display = ("name", "template_type", "age_range_label", "display_order", "is_active")
    list_filter = ("template_type", "is_active")
    search_fields = ("name", "age_range_label")
    ordering = ("template_type", "display_order")
    list_editable = ("display_order", "is_active")

    fieldsets = (
        (
            "Identity",
            {
                "fields": ("name", "template_type", "age_range_label", "age_min_months", "age_max_months", "display_order", "is_active"),
            },
        ),
        (
            "SOAP Templates",
            {
                "fields": ("subjective_template", "objective_template", "assessment_template", "plan_template"),
            },
        ),
        (
            "Exam & Development",
            {
                "fields": ("physical_exam_template", "development_checklist"),
                "classes": ("collapse",),
            },
        ),
    )


# ---------------------------------------------------------------------------
# DiagnosisCatalogAdmin
# ---------------------------------------------------------------------------


@admin.register(DiagnosisCatalog)
class DiagnosisCatalogAdmin(ModelAdmin):
    list_display = ("code", "name_es", "category", "is_common")
    list_filter = ("category", "is_common")
    search_fields = ("code", "name", "name_es")
    ordering = ("code",)


# ---------------------------------------------------------------------------
# VaccineScheduleAdmin
# ---------------------------------------------------------------------------


@admin.register(VaccineSchedule)
class VaccineScheduleAdmin(ModelAdmin):
    list_display = ("name", "dose_label", "age_label", "route", "display_order")
    list_filter = ("route",)
    search_fields = ("name", "disease", "age_label")
    ordering = ("age_months", "display_order")
    list_editable = ("display_order",)

    fieldsets = (
        (
            "Vaccine",
            {
                "fields": ("name", "disease", "dose_label"),
            },
        ),
        (
            "Age & Route",
            {
                "fields": ("age_months", "age_label", "route", "display_order"),
            },
        ),
    )


# ---------------------------------------------------------------------------
# VaccinationAdmin
# ---------------------------------------------------------------------------


@admin.register(Vaccination)
class VaccinationAdmin(ModelAdmin):
    list_display = ("patient", "vaccine_name", "dose_label", "administered_at", "lot_number")
    list_filter = ("vaccine_name", "administered_at")
    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "vaccine_name",
    )
    autocomplete_fields = ["patient", "practice"]
    list_select_related = ["patient", "practice"]
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-administered_at",)

    fieldsets = (
        (
            "Patient",
            {
                "fields": ("practice", "patient"),
            },
        ),
        (
            "Vaccine",
            {
                "fields": ("vaccine_schedule", "vaccine_name", "dose_label", "lot_number"),
            },
        ),
        (
            "Administration",
            {
                "fields": ("administered_at", "administered_by", "site", "notes"),
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
class DiagnosisAdmin(ModelAdmin):
    list_display = ("description", "code", "is_primary", "encounter", "created_at")
    list_filter = ("is_primary", "practice")
    search_fields = ("description", "code", "encounter__patient__first_name", "encounter__patient__last_name")
    autocomplete_fields = ["encounter", "practice"]
    list_select_related = ["encounter", "practice"]
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
