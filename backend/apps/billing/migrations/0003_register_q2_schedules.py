"""Register django-q2 periodic schedule for transfer expiry."""

from django.db import migrations


def register_schedules(apps, schema_editor):
    # Use the real model (not the historical snapshot) because django-q's
    # Schedule has fields (name, minutes) not exposed in the migration state.
    from django_q.models import Schedule

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
        ("django_q", "0019_alter_task_options_alter_ormq_key_alter_ormq_lock_and_more"),
    ]

    operations = [
        migrations.RunPython(register_schedules, migrations.RunPython.noop),
    ]
