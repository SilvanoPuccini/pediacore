"""
Data migration: seed bank account details for Practice pk=1 (Dra. Estefania).

These details are used when tutors choose bank transfer as their payment method.
"""

from django.db import migrations


def seed_bank_account(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    try:
        practice = Practice.objects.get(pk=1)
        practice.bank_name = "Banco prepago Tenpo"
        practice.account_type = "Cuenta Vista"
        practice.account_number = "111128625096"
        practice.account_holder = "ESTEFANIA ORTIGOSA"
        practice.account_rut = "28625096-3"
        practice.account_email = "estefiortigosa.pediatra@gmail.com"
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
