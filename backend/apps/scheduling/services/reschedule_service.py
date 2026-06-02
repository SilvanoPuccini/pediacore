"""
Reschedule service for PEDIACORE.

Handles the atomic appointment reschedule flow:
  1. Validate old appointment is CONFIRMED (raises AppointmentNotReschedulableError)
  2. Inside transaction.atomic():
     a. select_for_update overlap check on new slot
     b. Create new Appointment (CONFIRMED, rescheduled_from=old)
     c. Mark old Appointment RESCHEDULED, rescheduled_at=now()
     d. Transfer Payment FK to new appointment
     e. Invalidate old tokens (bulk set used_at=now())
  3. Post-transaction (outside atomic):
     - Notify waitlist (old slot freed)
     - Send reschedule email to tutors
     - Create new CONFIRM/CANCEL/RESCHEDULE tokens for new appointment

If any step inside the transaction fails the entire transaction is rolled back.
"""

from __future__ import annotations

import datetime
import logging
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from apps.scheduling.models import Appointment, AppointmentToken
from apps.scheduling.services.booking_service import SlotUnavailableError
from apps.scheduling.services.token_service import create_tokens_for_appointment
from apps.scheduling.services.waitlist import notify_waitlist_on_cancellation
from apps.notifications.services.email_service import send_appointment_reschedule

if TYPE_CHECKING:
    from apps.users.models import User

logger = logging.getLogger(__name__)


class AppointmentNotReschedulableError(Exception):
    """Raised when the appointment is not in a reschedulable state (CONFIRMED required)."""


def reschedule_appointment(
    appointment: Appointment,
    new_date: datetime.date,
    new_time: datetime.time,
    rescheduled_by: User | None = None,
) -> Appointment:
    """
    Reschedule a CONFIRMED appointment to a new date/time atomically.

    Transfers the Payment FK, invalidates old tokens, and sends post-commit
    notifications.

    Args:
        appointment: The old Appointment to reschedule (must be CONFIRMED).
        new_date: The new scheduled date.
        new_time: The new start time.
        rescheduled_by: The user performing the reschedule.

    Returns:
        The newly created Appointment (status=CONFIRMED).

    Raises:
        AppointmentNotReschedulableError: If appointment.status != CONFIRMED.
        SlotUnavailableError: If the target slot is already occupied.
    """
    # ── 1. Status validation (outside transaction — fast check) ──────────
    if appointment.status != Appointment.CONFIRMED:
        raise AppointmentNotReschedulableError(
            f"Appointment #{appointment.pk} is {appointment.status}. "
            "Only CONFIRMED appointments can be rescheduled."
        )

    with transaction.atomic():
        # ── 2a. Overlap check with row-level lock ─────────────────────────
        duration = datetime.timedelta(minutes=appointment.service.duration_minutes)
        start_dt = datetime.datetime.combine(datetime.date.today(), new_time)
        end_time = (start_dt + duration).time()

        blocking_qs = (
            Appointment.objects.select_for_update()
            .filter(
                scheduled_date=new_date,
                start_time__lt=end_time,
                end_time__gt=new_time,
            )
            .exclude(status__in=Appointment.SLOT_FREE_STATUSES)
            .exclude(pk=appointment.pk)  # exclude the old appointment itself
        )

        if appointment.is_online:
            blocking_qs = blocking_qs.filter(is_online=True)
        else:
            blocking_qs = blocking_qs.filter(location=appointment.location)

        if blocking_qs.exists():
            raise SlotUnavailableError(
                f"The slot at {new_date} {new_time} is already occupied."
            )

        # ── 2b. Create new Appointment (CONFIRMED) ────────────────────────
        new_appointment = Appointment.objects.create(
            practice=appointment.practice,
            patient=appointment.patient,
            service=appointment.service,
            location=appointment.location,
            doctor=appointment.doctor,
            booked_by=appointment.booked_by,
            scheduled_date=new_date,
            start_time=new_time,
            end_time=end_time,
            status=Appointment.CONFIRMED,
            is_online=appointment.is_online,
            notes=appointment.notes,
            rescheduled_from=appointment,
            confirmed_at=timezone.now(),
            reminder_24h_sent=False,
            reminder_2h_sent=False,
        )

        # ── 2c. Mark old appointment RESCHEDULED ──────────────────────────
        appointment.status = Appointment.RESCHEDULED
        appointment.rescheduled_at = timezone.now()
        appointment.save(update_fields=["status", "rescheduled_at", "updated_at"])

        # ── 2d. Transfer Payment FK ───────────────────────────────────────
        try:
            from apps.billing.models import Payment

            payment = Payment.objects.get(appointment=appointment)
            payment.appointment = new_appointment
            payment.save(update_fields=["appointment", "updated_at"])
            logger.info(
                "reschedule_appointment: Payment #%s transferred from Appointment #%s to #%s",
                payment.pk,
                appointment.pk,
                new_appointment.pk,
            )
        except Payment.DoesNotExist:
            logger.debug(
                "reschedule_appointment: no payment found for Appointment #%s — skipping transfer",
                appointment.pk,
            )

        # ── 2e. Invalidate old tokens ─────────────────────────────────────
        invalidated = AppointmentToken.objects.filter(
            appointment=appointment,
            used_at__isnull=True,
        ).update(used_at=timezone.now())
        logger.debug(
            "reschedule_appointment: invalidated %s token(s) for Appointment #%s",
            invalidated,
            appointment.pk,
        )

    # ── 3. Post-transaction: notifications ────────────────────────────────
    # Old slot freed — notify waitlist
    notify_waitlist_on_cancellation(appointment)

    # Reschedule email to tutors with new appointment details
    send_appointment_reschedule(new_appointment)

    # Generate new tokens for the new appointment
    create_tokens_for_appointment(new_appointment)

    logger.info(
        "reschedule_appointment: Appointment #%s rescheduled to new Appointment #%s "
        "(date=%s, time=%s, by=%s)",
        appointment.pk,
        new_appointment.pk,
        new_date,
        new_time,
        rescheduled_by,
    )

    return new_appointment
