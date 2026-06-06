import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class BillingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.billing"
    verbose_name = "Facturación"

    def ready(self) -> None:
        """Register django-q2 periodic tasks on startup."""
        import warnings

        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="Accessing the database during app initialization")
            self._register_transfer_expiry_schedule()

    def _register_transfer_expiry_schedule(self) -> None:
        """
        Register expire_pending_transfers as a periodic django-q2 task.

        Runs every 30 minutes.
        Uses get_or_create so re-starting the server does not create duplicate schedules.
        Wrapped in try/except to avoid breaking startup if the DB is not yet migrated.
        """
        try:
            from django_q.models import Schedule

            task_func = "apps.billing.services.transfer_expiry.expire_pending_transfers"

            Schedule.objects.get_or_create(
                func=task_func,
                defaults={
                    "name": "expire-pending-transfers",
                    "schedule_type": Schedule.MINUTES,
                    "minutes": 30,
                    "repeats": -1,  # repeat forever
                },
            )
        except Exception as exc:  # noqa: BLE001
            # During initial migrations or testing without DB tables, skip gracefully.
            logger.debug("Could not register transfer expiry schedule: %s", exc)
