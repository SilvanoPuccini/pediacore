"""Register django-q2 periodic schedule for hold expiry."""

from django.db import migrations


def register_schedules(apps, schema_editor):
    Schedule = apps.get_model("django_q", "Schedule")

    Schedule.objects.get_or_create(
        func="apps.scheduling.services.hold_expiry.expire_held_appointments",
        defaults={
            "name": "Expire held appointments",
            "schedule_type": "I",  # MINUTES
            "minutes": 2,
            "repeats": -1,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0005_add_call_platform"),
        ("django_q", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(register_schedules, migrations.RunPython.noop),
    ]
