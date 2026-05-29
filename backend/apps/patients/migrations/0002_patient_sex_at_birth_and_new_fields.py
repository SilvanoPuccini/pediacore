"""
Migration: Patient model — replace gender with sex_at_birth, add document_type,
insurance, country, region, comuna, address, phone fields.

Uses add-copy-remove pattern for the gender → sex_at_birth rename.
"""

from __future__ import annotations

from django.db import migrations, models


def forwards_gender_to_sex(apps, schema_editor):
    """Map Patient.gender → Patient.sex_at_birth."""
    Patient = apps.get_model("patients", "Patient")
    mapping = {
        "MALE": "M",
        "FEMALE": "F",
        "OTHER": "NO_ESPECIFICA",
    }
    for patient in Patient.objects.all():
        sex = mapping.get(patient.gender, "NO_ESPECIFICA")
        patient.sex_at_birth = sex
        patient.save(update_fields=["sex_at_birth"])


def backwards_sex_to_gender(apps, schema_editor):
    """Reverse: map Patient.sex_at_birth → Patient.gender."""
    Patient = apps.get_model("patients", "Patient")
    mapping = {
        "M": "MALE",
        "F": "FEMALE",
        "NO_ESPECIFICA": "OTHER",
    }
    for patient in Patient.objects.all():
        gender = mapping.get(patient.sex_at_birth, "OTHER")
        patient.gender = gender
        patient.save(update_fields=["gender"])


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0001_initial"),
    ]

    operations = [
        # ── Step 1: Add sex_at_birth with a temporary default ─────────────────
        migrations.AddField(
            model_name="patient",
            name="sex_at_birth",
            field=models.CharField(
                default="NO_ESPECIFICA",
                max_length=15,
                choices=[
                    ("M", "Male"),
                    ("F", "Female"),
                    ("NO_ESPECIFICA", "Not specified"),
                ],
                verbose_name="sex at birth",
            ),
        ),
        # ── Step 2: Copy gender → sex_at_birth ────────────────────────────────
        migrations.RunPython(
            forwards_gender_to_sex,
            backwards_sex_to_gender,
        ),
        # ── Step 3: Remove gender ──────────────────────────────────────────────
        migrations.RemoveField(
            model_name="patient",
            name="gender",
        ),
        # ── Step 4: Add new fields (all nullable or blank-safe) ───────────────
        migrations.AddField(
            model_name="patient",
            name="document_type",
            field=models.CharField(
                default="RUT",
                max_length=15,
                choices=[
                    ("RUT", "RUT (Chilean national ID)"),
                    ("PASAPORTE", "Passport"),
                    ("DNI_EXTRANJERO", "Foreign national ID"),
                ],
                verbose_name="document type",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="insurance",
            field=models.CharField(
                blank=True,
                default="",
                max_length=50,
                verbose_name="insurance",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="country",
            field=models.CharField(
                blank=True,
                default="Chile",
                max_length=100,
                verbose_name="country",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="region",
            field=models.CharField(
                blank=True,
                default="",
                max_length=100,
                verbose_name="region",
                help_text="e.g. La Araucanía",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="comuna",
            field=models.CharField(
                blank=True,
                default="",
                max_length=100,
                verbose_name="comuna",
                help_text="e.g. Pucón",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="address",
            field=models.TextField(
                blank=True,
                default="",
                verbose_name="address",
                help_text="Street address.",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="phone",
            field=models.CharField(
                blank=True,
                default="",
                max_length=30,
                verbose_name="phone",
                help_text="Patient/tutor contact phone (separate from User.phone).",
            ),
        ),
        # ── Step 5: Extend rut field max_length (was 12, now 20) ─────────────
        migrations.AlterField(
            model_name="patient",
            name="rut",
            field=models.CharField(
                blank=True,
                help_text="Chilean national ID (optional). Format: 12345678-9",
                max_length=20,
                null=True,
                unique=True,
                verbose_name="RUT / document number",
            ),
        ),
    ]
