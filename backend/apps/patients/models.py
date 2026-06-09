"""
Models for the patients app.

Manages pediatric patients (children), their relationship with tutors (parents),
and files attached to each patient record.
"""

from __future__ import annotations

from datetime import date

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel
from apps.core.validators import validate_rut


class Patient(BaseModel):
    """
    A pediatric patient (child) registered in the practice.

    Patients are children; their parents/guardians are linked via TutorPatient.
    All clinical data hangs off this model through related apps (medical_records, etc.).
    """

    # ── Sex at birth ────────────────────────────────────────────────────────────
    M = "M"
    F = "F"
    NO_ESPECIFICA = "NO_ESPECIFICA"

    SEX_AT_BIRTH_CHOICES = [
        (M, _("Male")),
        (F, _("Female")),
        (NO_ESPECIFICA, _("Not specified")),
    ]

    # ── Document type ───────────────────────────────────────────────────────────
    RUT = "RUT"
    DNI = "DNI"
    PASAPORTE = "PASAPORTE"
    OTRO = "OTRO"

    DOCUMENT_TYPE_CHOICES = [
        (RUT, _("RUT (Chilean national ID)")),
        (DNI, _("Foreign national ID (DNI)")),
        (PASAPORTE, _("Passport")),
        (OTRO, _("Other")),
    ]

    # ── Insurance choices ───────────────────────────────────────────────────────
    # Chilean insurance system: Fonasa, ISAPREs, FFAA systems, and self-pay.
    # Defined as a static tuple (not a DB table) — Chilean ISAPREs are government-
    # regulated with a stable set. ADR-2 in design.
    PARTICULAR = "PARTICULAR"
    FONASA_A = "FONASA_A"
    FONASA_B = "FONASA_B"
    FONASA_C = "FONASA_C"
    FONASA_D = "FONASA_D"
    ISAPRE_BANMEDICA = "ISAPRE_BANMEDICA"
    ISAPRE_COLMENA = "ISAPRE_COLMENA"
    ISAPRE_CONSALUD = "ISAPRE_CONSALUD"
    ISAPRE_CRUZ_BLANCA = "ISAPRE_CRUZ_BLANCA"
    ISAPRE_MASVIDA = "ISAPRE_MASVIDA"
    ISAPRE_NUEVA_MASVIDA = "ISAPRE_NUEVA_MASVIDA"
    ISAPRE_ESENCIAL = "ISAPRE_ESENCIAL"
    ISAPRE_VIDATRES = "ISAPRE_VIDATRES"
    ISAPRE_BUPA = "ISAPRE_BUPA"
    ISAPRE_LIFESECURITY = "ISAPRE_LIFESECURITY"
    ISAPRE_ALEMANA_SALUD = "ISAPRE_ALEMANA_SALUD"
    FFAA_CAPREDENA = "FFAA_CAPREDENA"
    FFAA_DIPRECA = "FFAA_DIPRECA"
    SIN_PREVISION = "SIN_PREVISION"
    OTRO = "OTRO"

    INSURANCE_CHOICES = [
        (PARTICULAR, _("Particular (self-pay)")),
        (FONASA_A, _("Fonasa A")),
        (FONASA_B, _("Fonasa B")),
        (FONASA_C, _("Fonasa C")),
        (FONASA_D, _("Fonasa D")),
        (ISAPRE_BANMEDICA, _("Isapre Banmédica")),
        (ISAPRE_COLMENA, _("Isapre Colmena Golden Cross")),
        (ISAPRE_CONSALUD, _("Isapre Consalud")),
        (ISAPRE_CRUZ_BLANCA, _("Isapre Cruz Blanca")),
        (ISAPRE_MASVIDA, _("Isapre MásVida")),
        (ISAPRE_NUEVA_MASVIDA, _("Isapre Nueva MásVida")),
        (ISAPRE_ESENCIAL, _("Isapre Esencial")),
        (ISAPRE_VIDATRES, _("Isapre Vida Tres")),
        (ISAPRE_BUPA, _("Isapre Bupa")),
        (ISAPRE_LIFESECURITY, _("Isapre Lifesecurity")),
        (ISAPRE_ALEMANA_SALUD, _("Isapre Alemana Salud")),
        (FFAA_CAPREDENA, _("FFAA Capredena")),
        (FFAA_DIPRECA, _("FFAA Dipreca")),
        (SIN_PREVISION, _("Sin previsión")),
        (OTRO, _("Otro")),
    ]

    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"

    BLOOD_TYPE_CHOICES = [
        (A_POS, "A+"),
        (A_NEG, "A-"),
        (B_POS, "B+"),
        (B_NEG, "B-"),
        (AB_POS, "AB+"),
        (AB_NEG, "AB-"),
        (O_POS, "O+"),
        (O_NEG, "O-"),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="patients",
        verbose_name=_("practice"),
    )
    first_name = models.CharField(_("first name"), max_length=150)
    last_name = models.CharField(_("last name"), max_length=150)
    date_of_birth = models.DateField(_("date of birth"))
    sex_at_birth = models.CharField(
        _("sex at birth"),
        max_length=15,
        choices=SEX_AT_BIRTH_CHOICES,
        default=NO_ESPECIFICA,
    )
    document_type = models.CharField(
        _("document type"),
        max_length=15,
        choices=DOCUMENT_TYPE_CHOICES,
        default=RUT,
    )
    rut = models.CharField(
        _("RUT / document number"),
        max_length=20,
        blank=False,
        unique=True,
        null=True,
        help_text=_("Chilean national ID. Format: 12345678-9"),
    )
    insurance = models.CharField(
        _("insurance"),
        max_length=50,
        choices=INSURANCE_CHOICES,
        blank=True,
    )
    # ── Geographic / contact fields ─────────────────────────────────────────────
    country = models.CharField(
        _("country"), max_length=100, default="Chile", blank=True
    )
    region = models.CharField(
        _("region"), max_length=100, blank=True, help_text=_("e.g. La Araucanía")
    )
    comuna = models.CharField(
        _("comuna"), max_length=100, blank=True, help_text=_("e.g. Pucón")
    )
    address = models.TextField(
        _("address"), blank=True, help_text=_("Street address.")
    )
    phone = models.CharField(
        _("phone"), max_length=30, blank=True,
        help_text=_("Patient/tutor contact phone (separate from User.phone).")
    )
    phone_prefix = models.CharField(
        _("phone prefix"), max_length=10, default="+56", blank=True,
    )
    blood_type = models.CharField(
        _("blood type"), max_length=5, blank=True, choices=BLOOD_TYPE_CHOICES
    )
    allergies = models.TextField(
        _("allergies"), blank=True, help_text=_("Known allergies — free text.")
    )
    chronic_conditions = models.TextField(
        _("chronic conditions"), blank=True, help_text=_("Chronic conditions — free text.")
    )
    notes = models.TextField(
        _("notes"), blank=True, help_text=_("General notes from the doctor.")
    )
    photo = models.ImageField(
        _("photo"), upload_to="patients/photos/", null=True, blank=True
    )
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        db_table = "patients"
        ordering = ["-created_at"]
        verbose_name = _("patient")
        verbose_name_plural = _("patients")

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def clean(self) -> None:
        """Validate RUT format when document_type is RUT."""
        if self.document_type == self.RUT and self.rut:
            validate_rut(self.rut)

    @property
    def full_name(self) -> str:
        """Return the patient's full name."""
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self) -> dict[str, int]:
        """
        Return the patient's age as a dict with 'years' and 'months'.

        Calculated from date_of_birth to today. Months represent the
        remaining months after whole years are subtracted.

        Example: {"years": 2, "months": 5}
        """
        today = date.today()
        dob = self.date_of_birth

        years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        # Calculate remaining months after subtracting whole years
        birthday_this_year_month = dob.month
        if (today.month, today.day) >= (dob.month, dob.day):
            # Birthday has already passed this year
            months = today.month - dob.month - (today.day < dob.day)
        else:
            # Birthday hasn't happened this year yet; measure from last birthday
            last_birthday_year = today.year - 1
            months_since_last = (today.month + 12) - dob.month - (today.day < dob.day)
            months = months_since_last % 12

        # Clamp months to [0, 11]
        months = max(0, months % 12)

        return {"years": years, "months": months}


class TutorPatient(BaseModel):
    """
    Junction model linking a tutor (User with TUTOR role) to a patient (child).

    A tutor can have multiple children; a child can have multiple tutors
    (e.g. both parents). The is_primary flag marks the main contact.
    """

    MOTHER = "MOTHER"
    FATHER = "FATHER"
    GUARDIAN = "GUARDIAN"
    OTHER = "OTHER"

    RELATIONSHIP_CHOICES = [
        (MOTHER, _("Mother")),
        (FATHER, _("Father")),
        (GUARDIAN, _("Guardian")),
        (OTHER, _("Other")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="tutor_patients",
        verbose_name=_("practice"),
    )
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutor_patients",
        verbose_name=_("tutor"),
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="tutor_patients",
        verbose_name=_("patient"),
    )
    relationship = models.CharField(
        _("relationship"), max_length=20, choices=RELATIONSHIP_CHOICES
    )
    is_primary = models.BooleanField(
        _("primary contact"),
        default=False,
        help_text=_("Marks this tutor as the main point of contact for the patient."),
    )

    class Meta:
        db_table = "tutor_patients"
        ordering = ["-created_at"]
        unique_together = [("tutor", "patient")]
        verbose_name = _("tutor-patient link")
        verbose_name_plural = _("tutor-patient links")

    def __str__(self) -> str:
        return f"{self.tutor.email} → {self.patient.full_name} ({self.relationship})"


class CoResponsible(models.Model):
    """Co-responsible adult linked to a tutor (e.g., father, grandmother)."""

    FATHER = "FATHER"
    MOTHER = "MOTHER"
    GRANDMOTHER = "GRANDMOTHER"
    GRANDFATHER = "GRANDFATHER"
    UNCLE = "UNCLE"
    SIBLING = "SIBLING"
    OTHER = "OTHER"

    RELATIONSHIPS = [
        (FATHER, _("Padre")),
        (MOTHER, _("Madre")),
        (GRANDMOTHER, _("Abuela")),
        (GRANDFATHER, _("Abuelo")),
        (UNCLE, _("Tío/a")),
        (SIBLING, _("Hermano/a")),
        (OTHER, _("Otro")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="co_responsibles",
    )
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="co_responsibles",
    )
    name = models.CharField(max_length=255, verbose_name=_("Nombre completo"))
    relationship = models.CharField(
        max_length=20,
        choices=RELATIONSHIPS,
        default=OTHER,
        verbose_name=_("Relación"),
    )
    rut = models.CharField(max_length=20, blank=True, verbose_name=_("RUT"))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_("Teléfono"))
    email = models.EmailField(blank=True, verbose_name=_("Email"))
    can_book = models.BooleanField(default=True, verbose_name=_("Puede agendar"))
    can_pickup = models.BooleanField(default=True, verbose_name=_("Puede retirar"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Co-responsable")
        verbose_name_plural = _("Co-responsables")
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_relationship_display()})"


class PatientFile(BaseModel):
    """
    A categorized file attached to a patient record.

    Files are stored on local disk (FileSystemStorage).
    Access to patient files is audit-logged.
    """

    LAB_RESULT = "LAB_RESULT"
    IMAGE = "IMAGE"
    PRESCRIPTION = "PRESCRIPTION"
    CERTIFICATE = "CERTIFICATE"
    OTHER = "OTHER"

    FILE_TYPE_CHOICES = [
        (LAB_RESULT, _("Lab result")),
        (IMAGE, _("Image")),
        (PRESCRIPTION, _("Prescription")),
        (CERTIFICATE, _("Certificate")),
        (OTHER, _("Other")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="patient_files",
        verbose_name=_("practice"),
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name=_("patient"),
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_files",
        verbose_name=_("uploaded by"),
    )
    file = models.FileField(_("file"), upload_to="patients/files/%Y/%m/")
    original_filename = models.CharField(_("original filename"), max_length=255)
    file_type = models.CharField(_("file type"), max_length=20, choices=FILE_TYPE_CHOICES)
    description = models.CharField(_("description"), max_length=500, blank=True)
    file_size = models.PositiveIntegerField(_("file size (bytes)"))

    class Meta:
        db_table = "patient_files"
        ordering = ["-created_at"]
        verbose_name = _("patient file")
        verbose_name_plural = _("patient files")

    def __str__(self) -> str:
        return f"{self.original_filename} ({self.patient.full_name})"
