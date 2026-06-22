"""
Waitlist notification service for PEDIACORE.

Handles automatic notification of the oldest matching waitlist entry when an
appointment is cancelled, freeing up a slot.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.db.models import Q
from django.utils import timezone

if TYPE_CHECKING:
    from apps.scheduling.models import Appointment, WaitlistEntry

logger = logging.getLogger(__name__)


def notify_waitlist_on_cancellation(appointment: Appointment) -> WaitlistEntry | None:
    """
    Notify the oldest matching waitlist entry that a slot became available.

    Matching criteria (all must hold):
    - status=WAITING
    - service matches the cancelled appointment's service
    - location matches OR entry has no location preference (null = any location)
    - preferred_date_start <= appointment.scheduled_date (entry's window starts no later
      than the freed date, so the date is relevant to the waiter)
    - if preferred_date_end is set: appointment.scheduled_date <= preferred_date_end

    Only the OLDEST (earliest created_at) matching entry is notified.
    Already-notified (NOTIFIED, BOOKED, EXPIRED, CANCELLED) entries are skipped.

    Args:
        appointment: The just-cancelled Appointment instance.

    Returns:
        The WaitlistEntry that was notified, or None if no match was found.
    """
    from apps.notifications.models import Notification
    from apps.patients.models import TutorPatient
    from apps.scheduling.models import WaitlistEntry

    cancelled_date = appointment.scheduled_date

    # Location filter: exact match OR entry accepts any location (null).
    # NOTE: None in __in list does NOT produce IS NULL in SQL — must use Q.
    location_q = Q(location=appointment.location) | Q(location__isnull=True)

    # Date range filter: preferred_date_end is null (open-ended) OR covers the freed date.
    date_end_q = Q(preferred_date_end__isnull=True) | Q(preferred_date_end__gte=cancelled_date)

    qs = WaitlistEntry.objects.filter(
        service=appointment.service,
        status=WaitlistEntry.WAITING,
        preferred_date_start__lte=cancelled_date,
    ).filter(location_q).filter(date_end_q)

    # Take the oldest (first in queue)
    entry = qs.order_by("created_at").first()

    if entry is None:
        logger.debug(
            "No WAITING waitlist entries found for service=%s location=%s date=%s",
            appointment.service_id,
            appointment.location_id,
            cancelled_date,
        )
        return None

    # Update entry status
    entry.status = WaitlistEntry.NOTIFIED
    entry.notified_at = timezone.now()
    entry.save(update_fields=["status", "notified_at", "updated_at"])

    # Create in-app notifications for every tutor linked to this patient
    tutors_qs = TutorPatient.objects.filter(
        patient=entry.patient
    ).select_related("tutor")

    for link in tutors_qs:
        tutor = link.tutor
        Notification.objects.create(
            practice=entry.practice,
            recipient=tutor,
            notification_type=Notification.WAITLIST_AVAILABLE,
            title="Turno disponible",
            message=(
                f"Hay un turno disponible para {entry.patient} "
                f"— {entry.service.name} el {cancelled_date}. "
                "Ingresá al sistema para reservarlo antes de que expire."
            ),
            related_type="WaitlistEntry",
            related_id=entry.pk,
        )

    doctor = entry.practice.owner
    if doctor:
        Notification.objects.create(
            practice=entry.practice,
            recipient=doctor,
            notification_type=Notification.WAITLIST_AVAILABLE,
            title="Lista de espera notificada",
            message=(
                f"Lista de espera: Se notificó a tutores sobre disponibilidad "
                f"para {entry.service.name} el {cancelled_date}."
            ),
            related_type="Appointment",
            related_id=appointment.pk,
        )

    logger.info(
        "Waitlist entry %s (patient=%s) notified for freed slot: service=%s date=%s",
        entry.pk,
        entry.patient_id,
        appointment.service_id,
        cancelled_date,
    )
    return entry
