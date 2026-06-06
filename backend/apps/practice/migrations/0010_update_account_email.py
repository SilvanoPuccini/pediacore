"""
Data migration: set account_email for Practice pk=1 (Dra. Estefania).

The previous seed migration (0009) had account_email="" because the email
wasn't known at the time. This migration sets it to the practice's public
contact email so tutors can copy it when making bank transfers.
"""

from django.db import migrations


def update_account_email(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    try:
        practice = Practice.objects.get(pk=1)
        if not practice.account_email:
            practice.account_email = "estefiortigosa.pediatra@gmail.com"
            practice.save(update_fields=["account_email"])
    except Practice.DoesNotExist:
        pass


def reverse_update(apps, schema_editor):
    Practice = apps.get_model("practice", "Practice")
    try:
        practice = Practice.objects.get(pk=1)
        if practice.account_email == "estefiortigosa.pediatra@gmail.com":
            practice.account_email = ""
            practice.save(update_fields=["account_email"])
    except Practice.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("practice", "0009_seed_bank_account_details"),
    ]

    operations = [
        migrations.RunPython(update_account_email, reverse_code=reverse_update),
    ]
