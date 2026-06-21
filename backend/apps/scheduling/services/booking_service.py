"""
Booking service for PEDIACORE.

Handles the atomic slot reservation flow:
  1. Validate patient ownership (PermissionError)
  2. Validate service is active (ValidationError)
  3. Acquire row-level lock and check for overlapping appointments
  4. Create Appointment + Payment (status and method depend on payment_method param)
  5. Return (appointment, payment)

Payment is processed later via the CardPayment Brick (process-card endpoint).

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
from apps.scheduling.models import Appointment

if TYPE_CHECKING:
    from apps.patients.models import Patient
    from apps.practice.models import Location, Practice, Service
    from apps.users.models import User

logger = logging.getLogger(__name__)

TRANSFER_EXPIRY_HOURS = 48


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
    payment_method: str = Payment.MERCADOPAGO,
    booked_by_doctor: bool = False,
) -> tuple[Appointment, Payment]:
    """
    Reserve a slot atomically and create a pending payment.

    For MERCADOPAGO: creates Appointment(HOLD) + Payment(PENDING).
    For TRANSFER: creates Appointment(PENDING) + Payment(PENDING) with transfer_expires_at.

    Payment is collected later via the CardPayment Brick (process-card endpoint).

    When booked_by_doctor=True, `user` is the doctor booking on behalf of a patient.
    The TutorPatient ownership check is skipped and the doctor field is set to `user`.

    Raises:
        PermissionError: patient does not belong to the requesting tutor (tutor flow only).
        ValidationError: service is inactive or payment_method is invalid.
        SlotUnavailableError: the slot is already taken.
    """
    from apps.patients.models import TutorPatient

    # ── 1. Patient ownership check (outside transaction — fast check) ────────
    # Skipped when the doctor books directly on behalf of a patient.
    if not booked_by_doctor and not TutorPatient.objects.filter(tutor=user, patient=patient).exists():
        raise PermissionError(f"Patient {patient.pk} does not belong to tutor {user.pk}.")

    # ── 2. Service active check ───────────────────────────────────────────────
    if not service.is_active:
        raise ValidationError(f"Service '{service.name}' is not active and cannot be booked.")

    # ── 2b. Payment method validation ────────────────────────────────────────
    valid_methods = {choice[0] for choice in Payment.PAYMENT_METHOD_CHOICES}
    if payment_method not in valid_methods:
        raise ValidationError(f"Invalid payment method: '{payment_method}'.")

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

        # ── 4. Resolve doctor ────────────────────────────────────────────────
        # When the doctor books directly, they are both the user and the doctor.
        doctor = user if booked_by_doctor else practice.owner

        if payment_method == Payment.MERCADOPAGO:
            # ── 5a. MERCADOPAGO path ─────────────────────────────────────────
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

            logger.info(
                "Booking hold created (MP): appointment=%s payment=%s",
                appointment.pk,
                payment.pk,
            )

            return appointment, payment

        else:
            # ── 5b. TRANSFER path ────────────────────────────────────────────
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
                status=Appointment.PENDING,
                is_online=is_online,
                call_platform=call_platform,
                notes=notes,
            )

            transfer_expires_at = timezone.now() + datetime.timedelta(hours=TRANSFER_EXPIRY_HOURS)

            payment = Payment.objects.create(
                practice=practice,
                appointment=appointment,
                patient=patient,
                paid_by=user,
                amount=service.price_clp,
                currency="CLP",
                status=Payment.PENDING,
                payment_method=Payment.TRANSFER,
                transfer_expires_at=transfer_expires_at,
            )

            logger.info(
                "Booking created (TRANSFER): appointment=%s payment=%s expires=%s",
                appointment.pk,
                payment.pk,
                transfer_expires_at.isoformat(),
            )

            return appointment, payment
