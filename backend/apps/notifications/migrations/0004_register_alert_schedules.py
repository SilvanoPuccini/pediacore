"""Register django-q2 periodic schedules for automatic alert tasks."""

from django.db import migrations


def register_alert_schedules(apps, schema_editor):
    Schedule = apps.get_model("django_q", "Schedule")

    Schedule.objects.get_or_create(
        func="apps.core.tasks.check_vaccination_alerts",
        defaults={
            "name": "Check vaccination alerts (patients under 2y with no recent encounter)",
            "schedule_type": "D",  # DAILY
            "repeats": -1,
        },
    )

    Schedule.objects.get_or_create(
        func="apps.core.tasks.check_pending_payments",
        defaults={
            "name": "Check pending payments older than 48h",
            "schedule_type": "I",  # MINUTES
            "minutes": 360,  # every 6 hours
            "repeats": -1,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0003_add_notification_template"),
        ("django_q", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(register_alert_schedules, migrations.RunPython.noop),
    ]
