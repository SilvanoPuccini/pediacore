"""Register django-q2 periodic schedules for reminders and no-shows."""

from django.db import migrations


def register_schedules(apps, schema_editor):
    Schedule = apps.get_model("django_q", "Schedule")

    Schedule.objects.get_or_create(
        func="apps.notifications.services.reminder_jobs.send_24h_reminders",
        defaults={
            "name": "Send 24h appointment reminders",
            "schedule_type": "I",  # MINUTES
            "minutes": 30,
            "repeats": -1,
        },
    )

    Schedule.objects.get_or_create(
        func="apps.notifications.services.reminder_jobs.send_2h_reminders",
        defaults={
            "name": "Send 2h online appointment reminders",
            "schedule_type": "I",  # MINUTES
            "minutes": 15,
            "repeats": -1,
        },
    )

    Schedule.objects.get_or_create(
        func="apps.notifications.services.reminder_jobs.mark_no_shows",
        defaults={
            "name": "Mark no-show appointments",
            "schedule_type": "I",  # MINUTES
            "minutes": 60,
            "repeats": -1,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0001_initial"),
        ("django_q", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(register_schedules, migrations.RunPython.noop),
    ]
