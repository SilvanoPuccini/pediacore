"""
Reminder scheduler for PEDIACORE.

Designed to be called periodically via a django-q2 scheduled task.
The schedule itself is NOT configured here — only the business logic.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)


def schedule_pending_reminders() -> int:
    """
    Find confirmed appointments that need a reminder and send them.

    An appointment needs a reminder when:
    - status is CONFIRMED
    - reminder_sent_at is None (not already reminded)
    - The appointment falls within the tutor's preferred reminder window
      (defaults to 24 h before appointment start).

    The function iterates through each appointment individually so that
    per-user reminder_hours_before preferences are respected.

    Returns:
        int: Number of appointments for which reminders were dispatched.
    """
    from apps.notifications.services.email_service import send_appointment_reminder
    from apps.scheduling.models import Appointment

    now = timezone.now()

    # Fetch all unreminded confirmed appointments in the next 48 h
    # (upper bound gives us a buffer; the per-user window is checked below)
    upcoming_window = now + timedelta(hours=48)
    appointments = (
        Appointment.objects.filter(
            status=Appointment.CONFIRMED,
            reminder_sent_at__isnull=True,
            scheduled_date__lte=upcoming_window.date(),
            scheduled_date__gte=now.date(),
        )
        .select_related("patient", "service", "location", "practice")
        .order_by("scheduled_date", "start_time")
    )

    count = 0
    for appointment in appointments:
        # Build appointment datetime for window comparison
        import datetime

        appt_datetime = timezone.make_aware(
            datetime.datetime.combine(appointment.scheduled_date, appointment.start_time)
        )

        # Determine the reminder window for any linked tutor
        # Use the minimum reminder_hours_before across tutors (most cautious)
        from apps.notifications.models import NotificationPreference
        from apps.patients.models import TutorPatient

        tutor_ids = TutorPatient.objects.filter(
            patient=appointment.patient
        ).values_list("tutor_id", flat=True)

        if not tutor_ids:
            continue

        # Collect reminder windows; default to 24 h when no preference set
        windows = []
        for tutor_id in tutor_ids:
            prefs = NotificationPreference.objects.filter(user_id=tutor_id).first()
            hours = prefs.reminder_hours_before if prefs else 24
            windows.append(hours)

        # Use the minimum window so we don't miss anyone
        reminder_hours = min(windows) if windows else 24
        send_at_or_before = appt_datetime - timedelta(hours=reminder_hours)

        if now >= send_at_or_before:
            try:
                send_appointment_reminder(appointment)
                count += 1
                logger.info(
                    "Reminder sent for appointment %s (%s %s)",
                    appointment.pk,
                    appointment.scheduled_date,
                    appointment.start_time,
                )
            except Exception as exc:
                logger.error(
                    "Failed to send reminder for appointment %s: %s",
                    appointment.pk,
                    exc,
                )

    logger.info("schedule_pending_reminders: %d reminders dispatched", count)
    return count
