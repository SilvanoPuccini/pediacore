import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    verbose_name = "Notifications"

    def ready(self) -> None:
        """Register django-q2 periodic tasks when the app is ready."""
        self._register_reminder_schedules()

    def _register_reminder_schedules(self) -> None:
        """
        Register reminder and no-show jobs as periodic django-q2 tasks.

        Schedules:
          - send_24h_reminders: every 30 minutes
          - send_2h_reminders: every 15 minutes
          - mark_no_shows: every 60 minutes (hourly)

        Uses get_or_create so re-starting the server does not create duplicate schedules.
        Wrapped in try/except to avoid breaking startup if the DB is not yet migrated.
        """
        try:
            from django_q.models import Schedule

            Schedule.objects.get_or_create(
                func="apps.notifications.services.reminder_jobs.send_24h_reminders",
                defaults={
                    "name": "Send 24h appointment reminders",
                    "schedule_type": Schedule.MINUTES,
                    "minutes": 30,
                    "repeats": -1,
                },
            )

            Schedule.objects.get_or_create(
                func="apps.notifications.services.reminder_jobs.send_2h_reminders",
                defaults={
                    "name": "Send 2h online appointment reminders",
                    "schedule_type": Schedule.MINUTES,
                    "minutes": 15,
                    "repeats": -1,
                },
            )

            Schedule.objects.get_or_create(
                func="apps.notifications.services.reminder_jobs.mark_no_shows",
                defaults={
                    "name": "Mark no-show appointments",
                    "schedule_type": Schedule.MINUTES,
                    "minutes": 60,
                    "repeats": -1,
                },
            )

        except Exception as exc:  # noqa: BLE001
            # During initial migrations or testing without DB tables, skip gracefully.
            logger.debug("Could not register reminder schedules: %s", exc)
