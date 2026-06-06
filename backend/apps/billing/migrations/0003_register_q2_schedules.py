"""Register django-q2 periodic schedule for transfer expiry."""

from django.db import migrations


def register_schedules(apps, schema_editor):
    Schedule = apps.get_model("django_q", "Schedule")

    Schedule.objects.get_or_create(
        func="apps.billing.services.transfer_expiry.expire_pending_transfers",
        defaults={
            "name": "expire-pending-transfers",
            "schedule_type": "I",  # MINUTES
            "minutes": 30,
            "repeats": -1,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0002_payment_transfer_fields"),
        ("django_q", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(register_schedules, migrations.RunPython.noop),
    ]
