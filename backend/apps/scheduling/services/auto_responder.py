"""
Auto-responder service for PEDIACORE.

Checks AutoResponderConfig when an appointment is created and sends an
automatic in-app notification if the booking happens outside working hours.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from apps.notifications.models import Notification
    from apps.scheduling.models import Appointment

logger = logging.getLogger(__name__)


def check_and_send_auto_response(appointment: Appointment) -> Notification | None:
    """
    Check if an automatic response should be sent for a newly created appointment.

    Looks up the AutoResponderConfig for the appointment's practice. If the
    config is active and the current wall-clock time falls outside the working
    hours configured for the appointment's location on today's day of the week,
    creates and returns an in-app Notification to the user who made the booking.

    Args:
        appointment: The newly created Appointment instance. Must have
            ``practice``, ``location``, and ``booked_by`` accessible.

    Returns:
        The created Notification instance if an auto-response was sent,
        or None when the config is inactive, no config exists, the current
        time is within working hours, or there is no user to notify.
    """
    from apps.notifications.models import Notification
    from apps.practice.models import WorkingHours
    from apps.scheduling.models import AutoResponderConfig

    # Guard: nothing to do if no one to notify.
    if appointment.booked_by is None:
        logger.debug(
            "Auto-responder skipped for appointment %s: no booked_by user.",
            appointment.pk,
        )
        return None

    # Fetch config — missing config is not an error, just a no-op.
    try:
        config = AutoResponderConfig.objects.get(practice=appointment.practice)
    except AutoResponderConfig.DoesNotExist:
        logger.debug(
            "Auto-responder skipped for appointment %s: no AutoResponderConfig.",
            appointment.pk,
        )
        return None

    if not config.is_active:
        logger.debug(
            "Auto-responder skipped for appointment %s: config is inactive.",
            appointment.pk,
        )
        return None

    # Determine the current time in the server's active timezone.
    now = timezone.localtime(timezone.now())
    current_time = now.time()
    today_dow = now.weekday()  # 0=Monday … 6=Sunday, matches WorkingHours constants

    # Look for active working hours for the appointment's location on today.
    working_hours_qs = WorkingHours.objects.filter(
        location=appointment.location,
        day_of_week=today_dow,
        is_active=True,
    )

    if working_hours_qs.exists():
        # If ANY active window covers the current time, we are inside hours.
        for wh in working_hours_qs:
            if wh.start_time <= current_time < wh.end_time:
                logger.debug(
                    "Auto-responder skipped for appointment %s: within working hours.",
                    appointment.pk,
                )
                return None
        # Current time is outside all defined windows → fall through to notify.
    # No working hours defined for today → treat as outside hours → notify.

    message = config.outside_hours_message or (
        "Your booking was received outside our working hours. "
        "We will confirm your appointment as soon as possible."
    )

    notification = Notification.objects.create(
        practice=appointment.practice,
        recipient=appointment.booked_by,
        notification_type=Notification.GENERAL,
        title="Booking received outside working hours",
        message=message,
        related_type="Appointment",
        related_id=appointment.pk,
    )

    logger.info(
        "Auto-responder notification %s created for appointment %s (user %s).",
        notification.pk,
        appointment.pk,
        appointment.booked_by.pk,
    )
    return notification
