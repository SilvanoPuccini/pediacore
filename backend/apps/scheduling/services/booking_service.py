"""
Booking service for PEDIACORE.

Handles the atomic slot reservation flow:
  1. Validate patient ownership (PermissionError)
  2. Validate service is active (ValidationError)
  3. Acquire row-level lock and check for overlapping appointments
  4. Create Appointment(HOLD) + Payment(PENDING)
  5. Call MercadoPago strategy to obtain checkout URL
  6. Return (appointment, payment, init_point)

If any step fails the entire transaction is rolled back.
"""

from __future__ import annotations

import datetime
import logging
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.billing.models import Payment
from apps.billing.services.payment_strategy import MercadoPagoStrategy
from apps.scheduling.models import Appointment

if TYPE_CHECKING:
    from apps.patients.models import Patient
    from apps.practice.models import Location, Practice, Service
    from apps.users.models import User

logger = logging.getLogger(__name__)


class SlotUnavailableError(Exception):
    """Raised when the requested slot is already taken by another appointment."""


def hold_appointment(
    user: User,
    practice: Practice,
    service: Service,
    location: Location | None,
    patient: Patient,
    scheduled_date: datetime.date,
    start_time: datetime.time,
    is_online: bool = False,
    call_platform: str = "",
    notes: str = "",
) -> tuple[Appointment, Payment, str, str]:
    """
    Reserve a slot atomically and initiate the MercadoPago payment flow.

    Returns:
        (appointment, payment, init_point, preference_id)
        where init_point is the MP checkout URL and preference_id is the MP preference ID.

    Raises:
        PermissionError: patient does not belong to the requesting tutor.
        ValidationError: service is inactive.
        SlotUnavailableError: the slot is already taken.
        Exception: MP SDK failure — transaction is rolled back.
    """
    from apps.patients.models import TutorPatient

    # ── 1. Patient ownership check (outside transaction — fast check) ────────
    if not TutorPatient.objects.filter(tutor=user, patient=patient).exists():
        raise PermissionError(f"Patient {patient.pk} does not belong to tutor {user.pk}.")

    # ── 2. Service active check ───────────────────────────────────────────────
    if not service.is_active:
        raise ValidationError(f"Service '{service.name}' is not active and cannot be booked.")

    with transaction.atomic():
        # ── 3. Overlap check with row-level lock ─────────────────────────────
        # Compute end_time from start_time + service duration
        duration = datetime.timedelta(minutes=service.duration_minutes)
        start_dt = datetime.datetime.combine(datetime.date.today(), start_time)
        end_time = (start_dt + duration).time()

        blocking_qs = (
            Appointment.objects.select_for_update()
            .filter(
                scheduled_date=scheduled_date,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            .exclude(status__in=Appointment.SLOT_FREE_STATUSES)
        )

        if is_online:
            blocking_qs = blocking_qs.filter(is_online=True)
        else:
            blocking_qs = blocking_qs.filter(location=location)

        if blocking_qs.exists():
            raise SlotUnavailableError(f"The slot at {scheduled_date} {start_time} is no longer available.")

        # ── 4. Resolve doctor (practice owner) ───────────────────────────────
        doctor = practice.owner

        # ── 5. Create Appointment(HOLD) ──────────────────────────────────────
        hold_minutes = getattr(settings, "BOOKING_HOLD_MINUTES", 10)
        hold_expires_at = timezone.now() + datetime.timedelta(minutes=hold_minutes)

        appointment = Appointment.objects.create(
            practice=practice,
            patient=patient,
            service=service,
            location=location,
            doctor=doctor,
            booked_by=user,
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=end_time,
            status=Appointment.HOLD,
            is_online=is_online,
            call_platform=call_platform,
            hold_expires_at=hold_expires_at,
            notes=notes,
        )

        # ── 6. Create Payment(PENDING, MERCADOPAGO) ──────────────────────────
        payment = Payment.objects.create(
            practice=practice,
            appointment=appointment,
            patient=patient,
            paid_by=user,
            amount=service.price_clp,
            currency="CLP",
            status=Payment.PENDING,
            payment_method=Payment.MERCADOPAGO,
        )

        # ── 7. Call MercadoPago strategy ──────────────────────────────────────
        access_token = getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "")
        strategy = MercadoPagoStrategy(access_token=access_token)
        result = strategy.create_preference(payment)

        init_point: str = result["init_point"]
        preference_id: str = result.get("preference_id", "")

        # create_preference() already saved metadata with provider + preference_id
        # and set external_id = "". No need to overwrite here.

        logger.info(
            "Booking hold created: appointment=%s payment=%s preference=%s",
            appointment.pk,
            payment.pk,
            preference_id,
        )

        return appointment, payment, init_point, preference_id
