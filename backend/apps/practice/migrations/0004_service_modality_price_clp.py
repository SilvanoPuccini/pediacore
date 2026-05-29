"""
Migration: Service model — replace price with price_clp, is_online_available with modality.
Add display_order, requires_fonasa_validation, requires_manual_coordination.

Uses add-copy-remove pattern to handle the type change from DecimalField to PositiveIntegerField.
"""

from __future__ import annotations

from decimal import Decimal

from django.db import migrations, models


def forwards_price_and_modality(apps, schema_editor):
    """Copy price → price_clp (as int), is_online_available → modality."""
    Service = apps.get_model("practice", "Service")
    for service in Service.objects.all():
        # Convert Decimal price to integer CLP
        try:
            service.price_clp = int(round(Decimal(str(service.price))))
        except Exception:
            service.price_clp = 0

        # Map boolean to modality enum
        if service.is_online_available:
            service.modality = "PRESENCIAL_Y_ONLINE"
        else:
            service.modality = "PRESENCIAL"

        service.save(update_fields=["price_clp", "modality"])


def backwards_price_and_modality(apps, schema_editor):
    """Reverse: copy price_clp → price (as Decimal), modality → is_online_available."""
    Service = apps.get_model("practice", "Service")
    for service in Service.objects.all():
        try:
            service.price = Decimal(str(service.price_clp))
        except Exception:
            service.price = Decimal("0.00")

        service.is_online_available = service.modality in (
            "ONLINE",
            "PRESENCIAL_Y_ONLINE",
        )
        service.save(update_fields=["price", "is_online_available"])


class Migration(migrations.Migration):

    dependencies = [
        ("practice", "0003_seed_practice_data"),
    ]

    operations = [
        # ── Step 1: Add new fields ─────────────────────────────────────────────
        migrations.AddField(
            model_name="service",
            name="price_clp",
            field=models.PositiveIntegerField(
                default=0,
                verbose_name="price (CLP)",
                help_text="Price in Chilean pesos (whole integer, no decimal).",
            ),
        ),
        migrations.AddField(
            model_name="service",
            name="modality",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("PRESENCIAL", "In-person only"),
                    ("ONLINE", "Online only"),
                    ("PRESENCIAL_Y_ONLINE", "In-person and online"),
                ],
                default="PRESENCIAL",
                verbose_name="modality",
            ),
        ),
        # ── Step 2: Copy data ──────────────────────────────────────────────────
        migrations.RunPython(
            forwards_price_and_modality,
            backwards_price_and_modality,
        ),
        # ── Step 3: Remove old fields ──────────────────────────────────────────
        migrations.RemoveField(
            model_name="service",
            name="price",
        ),
        migrations.RemoveField(
            model_name="service",
            name="is_online_available",
        ),
        # ── Step 4: Add new operational flags ─────────────────────────────────
        migrations.AddField(
            model_name="service",
            name="requires_fonasa_validation",
            field=models.BooleanField(
                default=False,
                verbose_name="requires Fonasa validation",
                help_text="If True, booking requires Fonasa benefit verification.",
            ),
        ),
        migrations.AddField(
            model_name="service",
            name="requires_manual_coordination",
            field=models.BooleanField(
                default=False,
                verbose_name="requires manual coordination",
                help_text="If True, the service cannot be self-booked; doctor must confirm.",
            ),
        ),
        migrations.AddField(
            model_name="service",
            name="display_order",
            field=models.PositiveIntegerField(
                default=0,
                verbose_name="display order",
                help_text="Controls the display order in booking UI. Lower = shown first.",
            ),
        ),
        # ── Step 5: Update Meta ordering ──────────────────────────────────────
        migrations.AlterModelOptions(
            name="service",
            options={
                "ordering": ["display_order", "name"],
                "verbose_name": "service",
                "verbose_name_plural": "services",
            },
        ),
    ]
