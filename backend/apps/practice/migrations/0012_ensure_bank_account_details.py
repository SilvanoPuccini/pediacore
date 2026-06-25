"""
Data migration: ensure bank account details are populated for the practice.

Previous migrations (0009, 0010) hardcoded Practice.objects.get(pk=1), which
silently skips if the practice has a different PK (e.g. pk=4 after a DB reset).

This migration looks up the practice by its stable slug instead, making it
resilient to PK changes across environments.
"""

from django.db import migrations

BANK_DETAILS = {
    "bank_name": "Banco prepago Tenpo",
    "account_type": "Cuenta Vista",
    "account_number": "111128625096",
    "account_holder": "ESTEFANIA ORTIGOSA",
    "account_rut": "28625096-3",
    "account_email": "contacto@estefipediatra.com",
}


def ensure_bank_account_details(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    try:
        practice = Practice.objects.get(slug="dra-estefi")
    except Practice.DoesNotExist:
        # No practice found — skip silently (e.g. test DB without seed data)
        return

    fields_to_update = []
    for field, value in BANK_DETAILS.items():
        current = getattr(practice, field, "")
        if not current:
            setattr(practice, field, value)
            fields_to_update.append(field)

    if fields_to_update:
        practice.save(update_fields=fields_to_update)


def reverse_ensure(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    try:
        practice = Practice.objects.get(slug="dra-estefi")
    except Practice.DoesNotExist:
        return

    # Only clear fields that we populated (leave pre-existing data alone)
    fields_to_clear = []
    for field, value in BANK_DETAILS.items():
        current = getattr(practice, field, "")
        if current == value:
            setattr(practice, field, "")
            fields_to_clear.append(field)

    if fields_to_clear:
        practice.save(update_fields=fields_to_clear)


class Migration(migrations.Migration):

    dependencies = [
        ("practice", "0011_add_is_online_enabled"),
    ]

    operations = [
        migrations.RunPython(ensure_bank_account_details, reverse_code=reverse_ensure),
    ]
