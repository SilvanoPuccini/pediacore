"""
Data migration: seed bank account details for Practice pk=1 (Dra. Estefania).

These details are used when tutors choose bank transfer as their payment method.
"""

from django.db import migrations


def seed_bank_account(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    try:
        practice = Practice.objects.get(pk=1)
        practice.bank_name = "Completar con banco"
        practice.account_type = "Completar con tipo de cuenta"
        practice.account_number = "Completar con número de cuenta"
        practice.account_holder = "Completar con nombre titular"
        practice.account_rut = "Completar con RUT"
        practice.account_email = "Completar con email correspondiente"
        practice.save(update_fields=[
            "bank_name",
            "account_type",
            "account_number",
            "account_holder",
            "account_rut",
            "account_email",
        ])
    except Practice.DoesNotExist:
        # No practice exists yet (e.g., fresh test DB) — skip silently
        pass


def reverse_seed_bank_account(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    try:
        practice = Practice.objects.get(pk=1)
        practice.bank_name = ""
        practice.account_type = ""
        practice.account_number = ""
        practice.account_holder = ""
        practice.account_rut = ""
        practice.account_email = ""
        practice.save(update_fields=[
            "bank_name",
            "account_type",
            "account_number",
            "account_holder",
            "account_rut",
            "account_email",
        ])
    except Practice.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("practice", "0008_practice_bank_account_fields"),
    ]

    operations = [
        migrations.RunPython(seed_bank_account, reverse_code=reverse_seed_bank_account),
    ]
