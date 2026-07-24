"""
Data migration: replace real bank account details with academic placeholders.

The previous seeds (0009, 0010, 0012) contained real banking data that caused
users to make actual transfers during academic/demo usage. This migration
overwrites those values with descriptive placeholder text.
"""

from django.db import migrations

PLACEHOLDER_BANK_DETAILS = {
    "bank_name": "Completar con banco",
    "account_type": "Completar con tipo de cuenta",
    "account_number": "Completar con número de cuenta",
    "account_holder": "Completar con nombre titular",
    "account_rut": "Completar con RUT",
    "account_email": "Completar con email correspondiente",
}


def replace_bank_data(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    for practice in Practice.objects.all():
        for field, value in PLACEHOLDER_BANK_DETAILS.items():
            setattr(practice, field, value)
        practice.save(update_fields=list(PLACEHOLDER_BANK_DETAILS.keys()))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("practice", "0012_ensure_bank_account_details"),
    ]

    operations = [
        migrations.RunPython(replace_bank_data, reverse_code=noop),
    ]
