"""
Models for the medical_records app.

Manages pediatric clinical history: encounters, SOAP notes, physical exams,
vital signs, anthropometry with WHO Z-scores, and diagnoses.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


# ---------------------------------------------------------------------------
# Encounter
# ---------------------------------------------------------------------------


class Encounter(BaseModel):
    """
    A medical visit or consultation for a pediatric patient.

    Anchors all clinical data (SOAP, physical exam, vitals, anthropometry,
    diagnoses) via one-to-one or foreign-key relations.
    """

    CONSULTATION = "CONSULTATION"
    WELL_CHILD_VISIT = "WELL_CHILD_VISIT"
    FOLLOW_UP = "FOLLOW_UP"
    EMERGENCY = "EMERGENCY"
    VACCINATION = "VACCINATION"
    OTHER = "OTHER"

    ENCOUNTER_TYPE_CHOICES = [
        (CONSULTATION, _("Consulta")),
        (WELL_CHILD_VISIT, _("Control sano")),
        (FOLLOW_UP, _("Seguimiento")),
        (EMERGENCY, _("Urgencia")),
        (VACCINATION, _("Vacunación")),
        (OTHER, _("Otro")),
    ]

    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (SCHEDULED, _("Agendado")),
        (IN_PROGRESS, _("En curso")),
        (COMPLETED, _("Completado")),
        (CANCELLED, _("Cancelado")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="encounters",
        verbose_name=_("practice"),
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="encounters",
        verbose_name=_("patient"),
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="encounters",
        verbose_name=_("doctor"),
    )
    location = models.ForeignKey(
        "practice.Location",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="encounters",
        verbose_name=_("location"),
    )
    encounter_type = models.CharField(
        _("encounter type"),
        max_length=20,
        choices=ENCOUNTER_TYPE_CHOICES,
        default=CONSULTATION,
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default=SCHEDULED,
    )
    scheduled_at = models.DateTimeField(_("scheduled at"), null=True, blank=True)
    started_at = models.DateTimeField(_("started at"), null=True, blank=True)
    completed_at = models.DateTimeField(_("completed at"), null=True, blank=True)
    reason_for_visit = models.TextField(_("reason for visit"), blank=True)

    class Meta:
        db_table = "encounters"
        ordering = ["-created_at"]
        verbose_name = _("encounter")
        verbose_name_plural = _("encounters")

    def __str__(self) -> str:
        return f"{self.patient.full_name} — {self.get_encounter_type_display()} ({self.created_at:%Y-%m-%d})"


# ---------------------------------------------------------------------------
# SOAPNote
# ---------------------------------------------------------------------------


class SOAPNote(BaseModel):
    """
    SOAP-format clinical note for an encounter.

    Follows the standard Subjective / Objective / Assessment / Plan structure
    used in outpatient pediatric consultations.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="soap_notes",
        verbose_name=_("practice"),
    )
    encounter = models.OneToOneField(
        Encounter,
        on_delete=models.CASCADE,
        related_name="soap_note",
        verbose_name=_("encounter"),
    )
    subjective = models.TextField(
        _("subjective"),
        blank=True,
        help_text=_("Patient/tutor complaints and reported symptoms."),
    )
    objective = models.TextField(
        _("objective"),
        blank=True,
        help_text=_("Doctor's direct observations and examination findings."),
    )
    assessment = models.TextField(
        _("assessment"),
        blank=True,
        help_text=_("Diagnosis and differential diagnoses."),
    )
    plan = models.TextField(
        _("plan"),
        blank=True,
        help_text=_("Treatment plan, follow-up instructions, and referrals."),
    )

    class Meta:
        db_table = "soap_notes"
        verbose_name = _("SOAP note")
        verbose_name_plural = _("SOAP notes")

    def __str__(self) -> str:
        return f"SOAP — {self.encounter}"


# ---------------------------------------------------------------------------
# PhysicalExam
# ---------------------------------------------------------------------------


class PhysicalExam(BaseModel):
    """
    Structured physical examination recorded during an encounter.

    Each field corresponds to a standard pediatric body-system review.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="physical_exams",
        verbose_name=_("practice"),
    )
    encounter = models.OneToOneField(
        Encounter,
        on_delete=models.CASCADE,
        related_name="physical_exam",
        verbose_name=_("encounter"),
    )
    general_appearance = models.TextField(_("general appearance"), blank=True)
    skin = models.TextField(_("skin"), blank=True)
    head_neck = models.TextField(_("head and neck"), blank=True)
    eyes = models.TextField(_("eyes"), blank=True)
    ears_nose_throat = models.TextField(_("ears, nose and throat"), blank=True)
    respiratory = models.TextField(_("respiratory"), blank=True)
    cardiovascular = models.TextField(_("cardiovascular"), blank=True)
    abdomen = models.TextField(_("abdomen"), blank=True)
    genitourinary = models.TextField(_("genitourinary"), blank=True)
    musculoskeletal = models.TextField(_("musculoskeletal"), blank=True)
    neurological = models.TextField(_("neurological"), blank=True)
    lymph_nodes = models.TextField(_("lymph nodes"), blank=True)
    additional_findings = models.TextField(_("additional findings"), blank=True)

    class Meta:
        db_table = "physical_exams"
        verbose_name = _("physical exam")
        verbose_name_plural = _("physical exams")

    def __str__(self) -> str:
        return f"Physical Exam — {self.encounter}"


# ---------------------------------------------------------------------------
# VitalSigns
# ---------------------------------------------------------------------------


class VitalSigns(BaseModel):
    """
    Vital signs recorded at the start of an encounter.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="vital_signs",
        verbose_name=_("practice"),
    )
    encounter = models.OneToOneField(
        Encounter,
        on_delete=models.CASCADE,
        related_name="vital_signs",
        verbose_name=_("encounter"),
    )
    temperature = models.DecimalField(
        _("temperature (°C)"),
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
    )
    heart_rate = models.PositiveIntegerField(_("heart rate (bpm)"), null=True, blank=True)
    respiratory_rate = models.PositiveIntegerField(_("respiratory rate (rpm)"), null=True, blank=True)
    blood_pressure_systolic = models.PositiveIntegerField(_("blood pressure systolic (mmHg)"), null=True, blank=True)
    blood_pressure_diastolic = models.PositiveIntegerField(_("blood pressure diastolic (mmHg)"), null=True, blank=True)
    oxygen_saturation = models.DecimalField(
        _("oxygen saturation (%)"),
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "vital_signs"
        verbose_name = _("vital signs")
        verbose_name_plural = _("vital signs")

    def __str__(self) -> str:
        return f"Vitals — {self.encounter}"


# ---------------------------------------------------------------------------
# Anthropometry
# ---------------------------------------------------------------------------


class Anthropometry(BaseModel):
    """
    Growth measurements with WHO Z-scores and percentiles.

    BMI is auto-calculated from weight and height on save.
    Z-scores and percentiles are computed via the WHO LMS service.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="anthropometry",
        verbose_name=_("practice"),
    )
    encounter = models.OneToOneField(
        Encounter,
        on_delete=models.CASCADE,
        related_name="anthropometry",
        verbose_name=_("encounter"),
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="anthropometry_records",
        verbose_name=_("patient"),
    )

    # Raw measurements
    weight_kg = models.DecimalField(
        _("weight (kg)"), max_digits=6, decimal_places=3, null=True, blank=True
    )
    height_cm = models.DecimalField(
        _("height (cm)"), max_digits=5, decimal_places=1, null=True, blank=True
    )
    head_circumference_cm = models.DecimalField(
        _("head circumference (cm)"), max_digits=5, decimal_places=1, null=True, blank=True
    )
    bmi = models.DecimalField(
        _("BMI"), max_digits=5, decimal_places=2, null=True, blank=True,
        help_text=_("Auto-calculated from weight and height."),
    )

    # WHO Z-scores
    weight_for_age_z = models.DecimalField(
        _("weight-for-age Z"), max_digits=5, decimal_places=2, null=True, blank=True
    )
    height_for_age_z = models.DecimalField(
        _("height-for-age Z"), max_digits=5, decimal_places=2, null=True, blank=True
    )
    head_circumference_for_age_z = models.DecimalField(
        _("head circumference-for-age Z"), max_digits=5, decimal_places=2, null=True, blank=True
    )
    bmi_for_age_z = models.DecimalField(
        _("BMI-for-age Z"), max_digits=5, decimal_places=2, null=True, blank=True
    )
    weight_for_height_z = models.DecimalField(
        _("weight-for-height Z"), max_digits=5, decimal_places=2, null=True, blank=True
    )

    # WHO Percentiles
    weight_for_age_percentile = models.DecimalField(
        _("weight-for-age percentile"), max_digits=5, decimal_places=1, null=True, blank=True
    )
    height_for_age_percentile = models.DecimalField(
        _("height-for-age percentile"), max_digits=5, decimal_places=1, null=True, blank=True
    )
    head_circumference_for_age_percentile = models.DecimalField(
        _("head circumference-for-age percentile"), max_digits=5, decimal_places=1, null=True, blank=True
    )
    bmi_for_age_percentile = models.DecimalField(
        _("BMI-for-age percentile"), max_digits=5, decimal_places=1, null=True, blank=True
    )
    weight_for_height_percentile = models.DecimalField(
        _("weight-for-height percentile"), max_digits=5, decimal_places=1, null=True, blank=True
    )

    class Meta:
        db_table = "anthropometry"
        ordering = ["-created_at"]
        verbose_name = _("anthropometry")
        verbose_name_plural = _("anthropometry records")

    def __str__(self) -> str:
        return f"Anthropometry — {self.encounter}"

    def save(self, *args, **kwargs) -> None:
        """Auto-calculate BMI and WHO Z-scores before persisting."""
        self._calculate_bmi()
        self.calculate_z_scores()
        super().save(*args, **kwargs)

    def _calculate_bmi(self) -> None:
        """BMI = weight (kg) / height (m)^2. Sets to None if inputs are missing."""
        if self.weight_kg and self.height_cm and Decimal(str(self.height_cm)) > 0:
            height_m = float(self.height_cm) / 100.0
            bmi_value = float(self.weight_kg) / (height_m ** 2)
            self.bmi = Decimal(str(round(bmi_value, 2)))
        else:
            self.bmi = None

    def calculate_z_scores(self) -> None:
        """
        Calculate WHO Z-scores and percentiles using the LMS service.

        Reads sex from the linked patient and age_in_months from the encounter's
        created_at vs. patient date_of_birth.
        """
        from apps.medical_records.services.who_zscore import calculate_who_z_scores

        try:
            patient = self.patient
            dob = patient.date_of_birth

            # Determine measurement date: use encounter's scheduled_at or created_at
            encounter = self.encounter
            measurement_date = (
                encounter.scheduled_at.date() if encounter.scheduled_at else encounter.created_at.date()
            )

            # Age in months (integer, floor)
            years = measurement_date.year - dob.year
            months_total = years * 12 + (measurement_date.month - dob.month)
            if measurement_date.day < dob.day:
                months_total -= 1
            age_in_months = max(0, months_total)

            # Map Patient sex_at_birth to WHO sex code
            from apps.patients.models import Patient
            sex = "M" if patient.sex_at_birth == Patient.M else "F"

            results = calculate_who_z_scores(
                patient_sex=sex,
                age_in_months=age_in_months,
                weight_kg=float(self.weight_kg) if self.weight_kg else None,
                height_cm=float(self.height_cm) if self.height_cm else None,
                head_circumference_cm=float(self.head_circumference_cm) if self.head_circumference_cm else None,
                bmi=float(self.bmi) if self.bmi else None,
            )

            def _to_decimal(val: Optional[float], places: int) -> Optional[Decimal]:
                if val is None:
                    return None
                return Decimal(str(round(val, places)))

            self.weight_for_age_z = _to_decimal(results.get("weight_for_age_z"), 2)
            self.height_for_age_z = _to_decimal(results.get("height_for_age_z"), 2)
            self.head_circumference_for_age_z = _to_decimal(results.get("head_circumference_for_age_z"), 2)
            self.bmi_for_age_z = _to_decimal(results.get("bmi_for_age_z"), 2)
            self.weight_for_height_z = _to_decimal(results.get("weight_for_height_z"), 2)

            self.weight_for_age_percentile = _to_decimal(results.get("weight_for_age_percentile"), 1)
            self.height_for_age_percentile = _to_decimal(results.get("height_for_age_percentile"), 1)
            self.head_circumference_for_age_percentile = _to_decimal(
                results.get("head_circumference_for_age_percentile"), 1
            )
            self.bmi_for_age_percentile = _to_decimal(results.get("bmi_for_age_percentile"), 1)
            self.weight_for_height_percentile = _to_decimal(results.get("weight_for_height_percentile"), 1)

        except Exception:
            # Never block a save because of Z-score calculation failure
            pass


# ---------------------------------------------------------------------------
# Diagnosis
# ---------------------------------------------------------------------------


class Diagnosis(BaseModel):
    """
    Clinical diagnosis associated with an encounter.

    ICD-10 code is optional. is_primary flags the main/principal diagnosis.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="diagnoses",
        verbose_name=_("practice"),
    )
    encounter = models.ForeignKey(
        Encounter,
        on_delete=models.CASCADE,
        related_name="diagnoses",
        verbose_name=_("encounter"),
    )
    code = models.CharField(
        _("ICD-10 code"),
        max_length=20,
        blank=True,
        help_text=_("Optional ICD-10 code, e.g. J06.9"),
    )
    description = models.CharField(_("description"), max_length=500)
    is_primary = models.BooleanField(_("primary diagnosis"), default=False)
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        db_table = "diagnoses"
        verbose_name = _("diagnosis")
        verbose_name_plural = _("diagnoses")

    def __str__(self) -> str:
        primary_label = " [PRIMARY]" if self.is_primary else ""
        code_label = f" ({self.code})" if self.code else ""
        return f"{self.description}{code_label}{primary_label}"


# ---------------------------------------------------------------------------
# EncounterTemplate
# ---------------------------------------------------------------------------


class EncounterTemplate(models.Model):
    """Pre-defined templates for common encounter types."""

    WELL_CHILD = "WELL_CHILD"
    MORBIDITY = "MORBIDITY"
    FOLLOW_UP = "FOLLOW_UP"
    VACCINATION = "VACCINATION"

    TEMPLATE_TYPE_CHOICES = [
        (WELL_CHILD, "Control niño sano"),
        (MORBIDITY, "Consulta morbilidad"),
        (FOLLOW_UP, "Control seguimiento"),
        (VACCINATION, "Vacunación"),
    ]

    name = models.CharField(max_length=200)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES)
    age_range_label = models.CharField(max_length=50, blank=True, default="")  # e.g. "1 mes", "6 meses", "2-3 años"
    age_min_months = models.PositiveSmallIntegerField(null=True, blank=True)
    age_max_months = models.PositiveSmallIntegerField(null=True, blank=True)
    # SOAP defaults
    subjective_template = models.TextField(blank=True, default="")
    objective_template = models.TextField(blank=True, default="")
    assessment_template = models.TextField(blank=True, default="")
    plan_template = models.TextField(blank=True, default="")
    # Physical exam defaults (normal findings)
    physical_exam_template = models.JSONField(default=dict, blank=True)
    # Development milestones to check at this age
    development_checklist = models.JSONField(default=list, blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["template_type", "display_order"]
        verbose_name = "Encounter template"
        verbose_name_plural = "Encounter templates"

    def __str__(self) -> str:
        return self.name


# ---------------------------------------------------------------------------
# VaccineSchedule
# ---------------------------------------------------------------------------


class VaccineSchedule(models.Model):
    """PNI Chile vaccination schedule — reference data."""

    name = models.CharField(max_length=100)  # e.g. "BCG"
    disease = models.CharField(max_length=200)  # e.g. "Tuberculosis"
    dose_label = models.CharField(max_length=50)  # e.g. "Única", "1ra dosis", "2da dosis"
    age_months = models.PositiveSmallIntegerField()  # recommended age in months
    age_label = models.CharField(max_length=50)  # e.g. "Recién nacido", "2 meses"
    route = models.CharField(max_length=50, blank=True, default="")  # IM, SC, oral
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["age_months", "display_order"]
        verbose_name = "Vaccine schedule entry"
        verbose_name_plural = "Vaccine schedule"

    def __str__(self) -> str:
        return f"{self.name} — {self.dose_label} ({self.age_label})"


# ---------------------------------------------------------------------------
# Vaccination
# ---------------------------------------------------------------------------


class Vaccination(BaseModel):
    """Record of a vaccine administered to a patient."""

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="vaccinations",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="vaccinations",
    )
    vaccine_schedule = models.ForeignKey(
        VaccineSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )
    vaccine_name = models.CharField(max_length=100)  # denormalized for custom vaccines
    dose_label = models.CharField(max_length=50)
    lot_number = models.CharField(max_length=50, blank=True, default="")
    administered_at = models.DateField()
    administered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="vaccinations_given",
    )
    site = models.CharField(max_length=50, blank=True, default="")  # e.g. "Muslo izquierdo"
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-administered_at"]
        verbose_name = "Vaccination"
        verbose_name_plural = "Vaccinations"

    def __str__(self) -> str:
        return f"{self.vaccine_name} — {self.patient} ({self.administered_at})"


# ---------------------------------------------------------------------------
# DiagnosisCatalog
# ---------------------------------------------------------------------------


class DiagnosisCatalog(models.Model):
    """Pre-loaded ICD-10 codes commonly used in pediatrics."""

    code = models.CharField(max_length=10, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    name_es = models.CharField(max_length=200)  # Spanish name
    category = models.CharField(max_length=50)  # e.g. "respiratory", "gastrointestinal"
    is_common = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "Diagnosis catalog entry"
        verbose_name_plural = "Diagnosis catalog"

    def __str__(self) -> str:
        return f"{self.code} — {self.name_es}"
