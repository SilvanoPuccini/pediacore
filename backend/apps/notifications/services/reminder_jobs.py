"""
Reminder job functions for PEDIACORE.

These functions are designed to be called by django-q2 scheduled tasks.
Each function queries the database for appointments matching specific criteria,
sends the appropriate reminders, and returns a count of actions taken.

Job schedule (registered in NotificationsConfig.ready()):
  - send_24h_reminders: every 30 minutes
  - send_2h_reminders: every 15 minutes
  - mark_no_shows: every 60 minutes
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)


def send_24h_reminders() -> int:
    """
    Find CONFIRMED appointments scheduled between 23.5h and 24.5h from now,
    and send a 24-hour reminder email to their linked tutors.

    An appointment is eligible if:
      - status = CONFIRMED
      - reminder_24h_sent = False
      - The appointment datetime (scheduled_date + start_time) is within
        the [now + 23.5h, now + 24.5h] window

    Returns:
        Number of reminders sent (one per appointment, regardless of tutor count).
    """
    from apps.notifications.services.email_service import send_24h_reminder
    from apps.scheduling.models import Appointment

    now = timezone.now()
    window_start = now + timedelta(hours=23, minutes=30)
    window_end = now + timedelta(hours=24, minutes=30)

    # Filter on scheduled_date first to limit the queryset, then check start_time in Python.
    # The window spans at most 1 calendar day so we check the two dates that could fall in range.
    candidate_dates = {
        window_start.date(),
        window_end.date(),
    }

    candidates = Appointment.objects.filter(
        status=Appointment.CONFIRMED,
        reminder_24h_sent=False,
        scheduled_date__in=candidate_dates,
    ).select_related("patient", "service", "location", "practice")

    count = 0
    for appointment in candidates:
        appt_dt = timezone.make_aware(
            datetime.combine(appointment.scheduled_date, appointment.start_time)
        )
        if window_start <= appt_dt <= window_end:
            try:
                send_24h_reminder(appointment)
                count += 1
                logger.info("24h reminder sent for Appointment #%s", appointment.pk)
            except Exception as exc:
                logger.error("send_24h_reminder failed for Appointment #%s: %s", appointment.pk, exc)

    return count


def send_2h_reminders() -> int:
    """
    Find CONFIRMED online appointments scheduled between 1.75h and 2.25h from now,
    and send a 2-hour reminder email to their linked tutors.

    An appointment is eligible if:
      - status = CONFIRMED
      - is_online = True
      - reminder_2h_sent = False
      - The appointment datetime is within the [now + 1.75h, now + 2.25h] window

    Returns:
        Number of reminders sent.
    """
    from apps.notifications.services.email_service import send_2h_reminder
    from apps.scheduling.models import Appointment

    now = timezone.now()
    window_start = now + timedelta(hours=1, minutes=45)
    window_end = now + timedelta(hours=2, minutes=15)

    candidate_dates = {
        window_start.date(),
        window_end.date(),
    }

    candidates = Appointment.objects.filter(
        status=Appointment.CONFIRMED,
        is_online=True,
        reminder_2h_sent=False,
        scheduled_date__in=candidate_dates,
    ).select_related("patient", "service", "location", "practice")

    count = 0
    for appointment in candidates:
        appt_dt = timezone.make_aware(
            datetime.combine(appointment.scheduled_date, appointment.start_time)
        )
        if window_start <= appt_dt <= window_end:
            try:
                send_2h_reminder(appointment)
                count += 1
                logger.info("2h reminder sent for Appointment #%s", appointment.pk)
            except Exception as exc:
                logger.error("send_2h_reminder failed for Appointment #%s: %s", appointment.pk, exc)

    return count


def mark_no_shows() -> int:
    """
    Find CONFIRMED appointments that are at least 30 minutes in the past with
    attendance_confirmed=False, and set their status to NO_SHOW.

    An appointment is eligible if:
      - status = CONFIRMED
      - attendance_confirmed = False
      - The appointment datetime (scheduled_date + start_time) is at least
        30 minutes before now

    This function is idempotent — running it multiple times does not change
    the result because NO_SHOW appointments are filtered out by status=CONFIRMED.

    Returns:
        Number of appointments marked as NO_SHOW.
    """
    from apps.scheduling.models import Appointment

    now = timezone.now()
    cutoff = now - timedelta(minutes=30)

    # Filter on scheduled_date to reduce the candidate set: only look at dates
    # that could possibly have a start_time placing the appointment before cutoff.
    # We check scheduled_date <= cutoff.date() to catch all appointments that are
    # at least partially in the past; Python-level check handles the exact cutoff.
    candidates = Appointment.objects.filter(
        status=Appointment.CONFIRMED,
        attendance_confirmed=False,
        scheduled_date__lte=cutoff.date(),
    ).select_related("practice")

    count = 0
    for appointment in candidates:
        appt_dt = timezone.make_aware(
            datetime.combine(appointment.scheduled_date, appointment.start_time)
        )
        if appt_dt <= cutoff:
            try:
                appointment.status = Appointment.NO_SHOW
                appointment.save(update_fields=["status", "updated_at"])
                count += 1
                logger.info("Marked Appointment #%s as NO_SHOW", appointment.pk)
            except Exception as exc:
                logger.error("mark_no_shows failed for Appointment #%s: %s", appointment.pk, exc)

    return count
