"""
Hold expiry service for PEDIACORE.

Designed to be called periodically via a django-q2 scheduled task.
Transitions expired HOLD appointments to EXPIRED and their related
PENDING Payments to FAILED.

The task is SAFE to run concurrently: select_for_update() ensures
row-level locking so two simultaneous runs do not double-process.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def expire_held_appointments() -> int:
    """
    Find all Appointments in HOLD status whose hold_expires_at is in the past,
    transition them to EXPIRED, and transition their related PENDING Payments
    to FAILED.

    Uses select_for_update() to prevent concurrent double-processing.

    Returns:
        int: Number of appointments transitioned to EXPIRED.
    """
    from apps.billing.models import Payment
    from apps.scheduling.models import Appointment

    now = timezone.now()
    count = 0

    with transaction.atomic():
        expired_appointments = Appointment.objects.select_for_update(skip_locked=True).filter(
            status=Appointment.HOLD,
            hold_expires_at__lt=now,
        )

        for appointment in expired_appointments:
            appointment.status = Appointment.EXPIRED
            appointment.save(update_fields=["status", "updated_at"])

            # Transition linked PENDING payment to FAILED
            # Access via reverse relation — use try/except for missing payment
            try:
                payment = Payment.objects.select_for_update().get(appointment=appointment)
                if payment.status == Payment.PENDING:
                    payment.status = Payment.FAILED
                    payment.save(update_fields=["status", "updated_at"])
            except Payment.DoesNotExist:
                pass

            count += 1
            logger.info(
                "Appointment #%s expired (hold_expires_at=%s)",
                appointment.pk,
                appointment.hold_expires_at,
            )

    logger.info("expire_held_appointments: %d appointment(s) expired", count)
    return count
