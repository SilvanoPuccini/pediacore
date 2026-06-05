import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class SchedulingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.scheduling"
    verbose_name = "Agenda"

    def ready(self) -> None:
        """Register django-q2 periodic tasks when the app is ready."""
        self._register_hold_expiry_schedule()

    def _register_hold_expiry_schedule(self) -> None:
        """
        Register expire_held_appointments as a periodic django-q2 task.

        Run interval is controlled by BOOKING_HOLD_EXPIRY_INTERVAL_MINUTES (default 2).
        Uses get_or_create so re-starting the server does not create duplicate schedules.
        Wrapped in try/except to avoid breaking startup if the DB is not yet migrated.
        """
        try:
            from django.conf import settings
            from django_q.models import Schedule

            interval_minutes = getattr(settings, "BOOKING_HOLD_EXPIRY_INTERVAL_MINUTES", 2)
            task_func = "apps.scheduling.services.hold_expiry.expire_held_appointments"

            Schedule.objects.get_or_create(
                func=task_func,
                defaults={
                    "name": "Expire held appointments",
                    "schedule_type": Schedule.MINUTES,
                    "minutes": interval_minutes,
                    "repeats": -1,  # repeat forever
                },
            )
        except Exception as exc:  # noqa: BLE001
            # During initial migrations or testing without DB tables, skip gracefully.
            logger.debug("Could not register hold expiry schedule: %s", exc)
