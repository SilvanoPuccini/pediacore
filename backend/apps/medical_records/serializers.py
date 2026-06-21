"""
Serializers for the medical_records app.
"""

from __future__ import annotations

from rest_framework import serializers

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
# SOAPNote
# ---------------------------------------------------------------------------


class SOAPNoteSerializer(serializers.ModelSerializer):
    """Read/write serializer for SOAP notes."""

    class Meta:
        model = SOAPNote
        fields = [
            "id",
            "practice",
            "encounter",
            "subjective",
            "objective",
            "assessment",
            "plan",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "practice", "encounter", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# PhysicalExam
# ---------------------------------------------------------------------------


class PhysicalExamSerializer(serializers.ModelSerializer):
    """Read/write serializer for physical examination records."""

    class Meta:
        model = PhysicalExam
        fields = [
            "id",
            "practice",
            "encounter",
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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "practice", "encounter", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# VitalSigns
# ---------------------------------------------------------------------------


class VitalSignsSerializer(serializers.ModelSerializer):
    """Read/write serializer for vital signs."""

    class Meta:
        model = VitalSigns
        fields = [
            "id",
            "practice",
            "encounter",
            "temperature",
            "heart_rate",
            "respiratory_rate",
            "blood_pressure_systolic",
            "blood_pressure_diastolic",
            "oxygen_saturation",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "practice", "encounter", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Anthropometry
# ---------------------------------------------------------------------------


class AnthropometrySerializer(serializers.ModelSerializer):
    """Full read serializer including all Z-scores and percentiles."""

    class Meta:
        model = Anthropometry
        fields = [
            "id",
            "practice",
            "encounter",
            "patient",
            # Measurements
            "weight_kg",
            "height_cm",
            "head_circumference_cm",
            "bmi",
            # Z-scores
            "weight_for_age_z",
            "height_for_age_z",
            "head_circumference_for_age_z",
            "bmi_for_age_z",
            "weight_for_height_z",
            # Percentiles
            "weight_for_age_percentile",
            "height_for_age_percentile",
            "head_circumference_for_age_percentile",
            "bmi_for_age_percentile",
            "weight_for_height_percentile",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "practice",
            "encounter",
            "patient",
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
            "created_at",
            "updated_at",
        ]


class AnthropometryCreateSerializer(serializers.ModelSerializer):
    """
    Write-only serializer: accepts raw measurements, Z-scores are auto-calculated
    in the model's save() method.
    """

    class Meta:
        model = Anthropometry
        fields = [
            "id",
            "practice",
            "encounter",
            "patient",
            "weight_kg",
            "height_cm",
            "head_circumference_cm",
        ]
        read_only_fields = ["id", "practice", "encounter", "patient"]


# ---------------------------------------------------------------------------
# VaccineSchedule
# ---------------------------------------------------------------------------


class VaccineScheduleSerializer(serializers.ModelSerializer):
    """Read-only serializer for PNI Chile vaccination schedule entries."""

    class Meta:
        model = VaccineSchedule
        fields = [
            "id",
            "name",
            "disease",
            "dose_label",
            "age_months",
            "age_label",
            "route",
            "display_order",
        ]


# ---------------------------------------------------------------------------
# Vaccination
# ---------------------------------------------------------------------------


class VaccinationSerializer(serializers.ModelSerializer):
    """Full read serializer for vaccination records."""

    patient_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = Vaccination
        fields = [
            "id",
            "practice",
            "patient",
            "patient_name",
            "vaccine_schedule",
            "vaccine_name",
            "dose_label",
            "lot_number",
            "administered_at",
            "administered_by",
            "site",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "practice", "patient_name", "created_at", "updated_at"]


class VaccinationCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating vaccination records. Practice injected in perform_create."""

    class Meta:
        model = Vaccination
        fields = [
            "id",
            "patient",
            "vaccine_schedule",
            "vaccine_name",
            "dose_label",
            "lot_number",
            "administered_at",
            "site",
            "notes",
        ]
        read_only_fields = ["id"]


# ---------------------------------------------------------------------------
# DiagnosisCatalog
# ---------------------------------------------------------------------------


class DiagnosisCatalogSerializer(serializers.ModelSerializer):
    """Read-only serializer for ICD-10 catalog entries."""

    class Meta:
        model = DiagnosisCatalog
        fields = ["id", "code", "name", "name_es", "category", "is_common"]


# ---------------------------------------------------------------------------
# Diagnosis
# ---------------------------------------------------------------------------


class DiagnosisSerializer(serializers.ModelSerializer):
    """CRUD serializer for diagnoses."""

    class Meta:
        model = Diagnosis
        fields = [
            "id",
            "practice",
            "encounter",
            "code",
            "description",
            "is_primary",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "practice", "encounter", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# EncounterTemplate
# ---------------------------------------------------------------------------


class EncounterTemplateSerializer(serializers.ModelSerializer):
    """Read-only serializer for encounter templates."""

    template_type_display = serializers.CharField(
        source="get_template_type_display", read_only=True
    )

    class Meta:
        model = EncounterTemplate
        fields = [
            "id",
            "name",
            "template_type",
            "template_type_display",
            "age_range_label",
            "age_min_months",
            "age_max_months",
            "subjective_template",
            "objective_template",
            "assessment_template",
            "plan_template",
            "physical_exam_template",
            "development_checklist",
            "display_order",
            "is_active",
        ]


# ---------------------------------------------------------------------------
# Encounter
# ---------------------------------------------------------------------------


class EncounterListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — no nested data."""

    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.SerializerMethodField()
    encounter_type_display = serializers.CharField(source="get_encounter_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    public_summary = serializers.SerializerMethodField()

    class Meta:
        model = Encounter
        fields = [
            "id",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "encounter_type",
            "encounter_type_display",
            "status",
            "status_display",
            "scheduled_at",
            "reason_for_visit",
            "created_at",
            "public_summary",
        ]
        read_only_fields = ["id", "created_at"]

    def get_doctor_name(self, obj: Encounter) -> str:
        doctor = obj.doctor
        return f"{doctor.first_name} {doctor.last_name}".strip() or doctor.email

    def get_public_summary(self, obj: Encounter) -> dict | None:
        """Return only the public subset of the SOAP note for tutor-facing views."""
        soap = getattr(obj, "soap_note", None)
        if soap is None:
            return None
        if not soap.subjective and not soap.plan:
            return None
        return {
            "reason": soap.subjective,
            "plan": soap.plan,
        }


class EncounterDetailSerializer(serializers.ModelSerializer):
    """Full read serializer with all nested clinical sub-records."""

    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.SerializerMethodField()
    encounter_type_display = serializers.CharField(source="get_encounter_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    soap_note = SOAPNoteSerializer(read_only=True)
    physical_exam = PhysicalExamSerializer(read_only=True)
    vital_signs = VitalSignsSerializer(read_only=True)
    anthropometry = AnthropometrySerializer(read_only=True)
    diagnoses = DiagnosisSerializer(many=True, read_only=True)

    class Meta:
        model = Encounter
        fields = [
            "id",
            "practice",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "location",
            "encounter_type",
            "encounter_type_display",
            "status",
            "status_display",
            "scheduled_at",
            "started_at",
            "completed_at",
            "reason_for_visit",
            "soap_note",
            "physical_exam",
            "vital_signs",
            "anthropometry",
            "diagnoses",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_doctor_name(self, obj: Encounter) -> str:
        doctor = obj.doctor
        return f"{doctor.first_name} {doctor.last_name}".strip() or doctor.email


class EncounterCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating new encounters."""

    class Meta:
        model = Encounter
        fields = [
            "id",
            "practice",
            "patient",
            "doctor",
            "location",
            "encounter_type",
            "status",
            "scheduled_at",
            "started_at",
            "completed_at",
            "reason_for_visit",
        ]
        read_only_fields = ["id"]
