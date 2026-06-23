"""
Waitlist auto-offer service for PEDIACORE.

When an appointment is cancelled and a slot frees up, the system automatically:
  1. Finds the best matching WAITING entry in the queue
  2. Calculates a confirmation window based on time-to-appointment
  3. Creates a real Appointment (HOLD) + Payment (PENDING)
  4. Sends payment link email to the tutor
  5. Schedules an expiry task — if the tutor doesn't confirm, the offer
     cascades to the next person in the queue

The cascade continues until someone confirms or the queue is exhausted
or there isn't enough time left before the appointment.
"""

from __future__ import annotations

import datetime
import logging
from typing import TYPE_CHECKING

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

if TYPE_CHECKING:
    from apps.scheduling.models import Appointment, WaitlistEntry

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

MIN_OFFER_MINUTES = 10   # Minimum confirmation window per candidate
MAX_OFFER_MINUTES = 30   # Maximum confirmation window per candidate
MIN_LEAD_MINUTES = 60    # Don't auto-offer if appointment is less than 1 hour away


def _time_until_appointment(appointment: Appointment) -> float:
    """Return minutes until the appointment starts."""
    appt_dt = timezone.make_aware(
        datetime.datetime.combine(appointment.scheduled_date, appointment.start_time)
    )
    return (appt_dt - timezone.now()).total_seconds() / 60.0


def _calculate_offer_minutes(minutes_until_appt: float, candidates_remaining: int) -> int:
    """
    Calculate how many minutes to give each candidate.

    Strategy: divide usable time evenly, clamp between MIN and MAX.
    The MAX varies by urgency tier:
      - > 12h before: 30 min per candidate (plenty of time)
      - 4-12h before: 20 min per candidate (moderate urgency)
      - 1-4h before:  15 min per candidate (high urgency)

    Reserve MIN_LEAD_MINUTES (60 min) before the appointment so the
    confirmed patient has time to prepare.

    Examples:
      - 720 min (12h), 3 candidates → 30 min each
      - 360 min (6h), 4 candidates  → 20 min each (4-12h tier max)
      - 120 min (2h), 2 candidates  → 15 min each (1-4h tier max)
    """
    if candidates_remaining <= 0:
        return MAX_OFFER_MINUTES

    usable_time = minutes_until_appt - MIN_LEAD_MINUTES
    if usable_time <= 0:
        return MIN_OFFER_MINUTES

    # Tier-based max: more urgency = shorter windows
    if minutes_until_appt > 720:       # > 12h
        tier_max = 30
    elif minutes_until_appt > 240:     # 4-12h
        tier_max = 20
    else:                               # 1-4h
        tier_max = 15

    per_candidate = usable_time / candidates_remaining
    return min(tier_max, max(MIN_OFFER_MINUTES, int(per_candidate)))


def find_matching_waitlist_entries(appointment: Appointment):
    """
    Find all WAITING waitlist entries that match a freed slot.

    Matching criteria:
    - status = WAITING
    - same service
    - location matches OR entry accepts any location (null)
    - preferred_date_start <= appointment date
    - preferred_date_end is null OR >= appointment date

    Returns QuerySet ordered by priority (HIGH first) then created_at (oldest first).
    """
    from apps.scheduling.models import WaitlistEntry

    cancelled_date = appointment.scheduled_date

    location_q = Q(location=appointment.location) | Q(location__isnull=True)
    date_end_q = Q(preferred_date_end__isnull=True) | Q(preferred_date_end__gte=cancelled_date)

    # Priority ordering: HIGH > NORMAL > LOW, then FIFO
    priority_order = {
        WaitlistEntry.HIGH: 0,
        WaitlistEntry.NORMAL: 1,
        WaitlistEntry.LOW: 2,
    }

    qs = (
        WaitlistEntry.objects.filter(
            service=appointment.service,
            status=WaitlistEntry.WAITING,
            preferred_date_start__lte=cancelled_date,
        )
        .filter(location_q)
        .filter(date_end_q)
        .select_related("patient", "service", "location", "practice")
        .order_by("created_at")
    )

    # Sort by priority then created_at (Python sort since priority is a char field)
    return sorted(qs, key=lambda e: (priority_order.get(e.priority, 1), e.created_at))


def auto_offer_freed_slot(
    appointment: Appointment,
    skip_entry_ids: list[int] | None = None,
) -> WaitlistEntry | None:
    """
    Automatically offer a freed slot to the next matching waitlist candidate.

    This is the main entry point — called from:
      - cancellation.py (when a patient cancels)
      - waitlist_expiry.py (when an offer expires and we cascade to the next person)

    Args:
        appointment: The cancelled/expired appointment whose slot is now free.
        skip_entry_ids: Entry IDs to skip (already offered and declined/expired).

    Returns:
        The WaitlistEntry that was offered, or None if no match or not enough time.
    """
    from apps.notifications.models import Notification
    from apps.patients.models import TutorPatient
    from apps.scheduling.models import WaitlistEntry

    skip_ids = set(skip_entry_ids or [])

    # Check if there's enough time
    minutes_left = _time_until_appointment(appointment)
    if minutes_left < MIN_LEAD_MINUTES:
        logger.info(
            "auto_offer_freed_slot: only %.0f min left for Appointment #%s, skipping auto-offer",
            minutes_left,
            appointment.pk,
        )
        return None

    # Find candidates
    candidates = find_matching_waitlist_entries(appointment)
    candidates = [c for c in candidates if c.pk not in skip_ids]

    if not candidates:
        logger.debug(
            "auto_offer_freed_slot: no WAITING entries for service=%s location=%s date=%s",
            appointment.service_id,
            appointment.location_id,
            appointment.scheduled_date,
        )
        return None

    entry = candidates[0]
    remaining_candidates = len(candidates)
    offer_minutes = _calculate_offer_minutes(minutes_left, remaining_candidates)

    logger.info(
        "auto_offer_freed_slot: offering to entry #%s (patient=%s), "
        "window=%d min, %d candidates remaining, %.0f min until appt",
        entry.pk,
        entry.patient_id,
        offer_minutes,
        remaining_candidates,
        minutes_left,
    )

    # Create appointment + payment via hold_appointment
    from apps.scheduling.services.booking_service import SlotUnavailableError, hold_appointment

    try:
        new_appointment, payment = hold_appointment(
            user=appointment.practice.owner,
            practice=entry.practice,
            service=entry.service,
            location=entry.location or appointment.location,
            patient=entry.patient,
            scheduled_date=appointment.scheduled_date,
            start_time=appointment.start_time,
            is_online=(entry.location is None and appointment.location is None),
            notes=f"Auto-offered from waitlist #{entry.pk}",
            payment_method="MERCADOPAGO",
            booked_by_doctor=True,
        )
    except SlotUnavailableError:
        logger.warning(
            "auto_offer_freed_slot: slot no longer available for entry #%s",
            entry.pk,
        )
        return None
    except Exception as exc:
        logger.error(
            "auto_offer_freed_slot: hold_appointment failed for entry #%s: %s",
            entry.pk,
            exc,
        )
        return None

    # Build internal payment link (Wallet Brick embedded in the portal)
    frontend_url = getattr(settings, "FRONTEND_URL", "https://estefipediatra.com").rstrip("/")
    payment_link = f"{frontend_url}/portal/pagos/{payment.pk}"

    # Update waitlist entry → OFFERED
    entry.status = WaitlistEntry.OFFERED
    entry.notified_at = timezone.now()
    entry.offer_expires_at = timezone.now() + datetime.timedelta(minutes=offer_minutes)
    entry.offered_appointment = new_appointment
    entry.save(
        update_fields=[
            "status",
            "notified_at",
            "offer_expires_at",
            "offered_appointment",
            "updated_at",
        ]
    )

    # Schedule expiry task with cascade
    try:
        from django_q.models import Schedule
        from django_q.tasks import schedule

        schedule(
            "apps.scheduling.services.waitlist_expiry.expire_and_cascade",
            entry.pk,
            schedule_type=Schedule.ONCE,
            next_run=entry.offer_expires_at,
        )
    except Exception as exc:
        logger.warning("auto_offer_freed_slot: could not schedule expiry task: %s", exc)

    # Notify tutors (in-app)
    tutors_qs = TutorPatient.objects.filter(patient=entry.patient).select_related("tutor")
    for link in tutors_qs:
        Notification.objects.create(
            practice=entry.practice,
            recipient=link.tutor,
            notification_type=Notification.WAITLIST_AVAILABLE,
            title="Turno disponible",
            message=(
                f"Se liberó un turno para {entry.patient.full_name} "
                f"— {entry.service.name} el {appointment.scheduled_date}. "
                f"Tenés {offer_minutes} minutos para confirmar."
            ),
            related_type="Appointment",
            related_id=new_appointment.pk,
        )

    # Notify doctor
    doctor = entry.practice.owner
    if doctor:
        Notification.objects.create(
            practice=entry.practice,
            recipient=doctor,
            notification_type=Notification.WAITLIST_AVAILABLE,
            title="Auto-oferta enviada",
            message=(
                f"Se ofreció automáticamente un turno a {entry.patient.full_name} "
                f"(lista de espera) para {entry.service.name} el {appointment.scheduled_date}. "
                f"Tiene {offer_minutes} min para confirmar."
            ),
            related_type="Appointment",
            related_id=new_appointment.pk,
        )

    # Send email with payment link
    try:
        from apps.notifications.services.email_service import send_waitlist_offer_email

        send_waitlist_offer_email(
            entry,
            slot_date=appointment.scheduled_date,
            slot_time=appointment.start_time,
            payment_link=payment_link,
            expires_minutes=offer_minutes,
        )
    except Exception as exc:
        logger.warning("auto_offer_freed_slot: email failed for entry #%s: %s", entry.pk, exc)

    return entry


# ─── Backward compatibility ───────────────────────────────────────────────────

def notify_waitlist_on_cancellation(appointment: Appointment) -> WaitlistEntry | None:
    """
    Called from cancellation.py when an appointment is cancelled.
    Now delegates to the full auto-offer flow.
    """
    return auto_offer_freed_slot(appointment)
