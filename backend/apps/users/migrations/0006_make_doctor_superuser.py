"""
Data migration: Grant superuser status to the doctor user.

The doctor (doctor@estefipediatra.com) is the practice owner who needs full
admin access to manage patients, appointments, billing, and content.
Without is_superuser=True, Django admin returns 403 Forbidden on every section
because no explicit model permissions are assigned.

This migration must be idempotent — safe to run even if the user doesn't exist
(e.g. fresh DB with seed_data which now sets is_superuser=True).
"""

from django.db import migrations


def make_doctor_superuser(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(email="doctor@estefipediatra.com").update(
        is_superuser=True
    )


def reverse_make_doctor_superuser(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(email="doctor@estefipediatra.com").update(
        is_superuser=False
    )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_add_avatar_field"),
    ]

    operations = [
        migrations.RunPython(
            make_doctor_superuser,
            reverse_make_doctor_superuser,
        ),
    ]
