"""
Transfer expiry service for PEDIACORE.

Designed to be called periodically via a django-q2 scheduled task (every 30 min).
Cancels PENDING TRANSFER payments whose transfer_expires_at is in the past.

The task is SAFE to run concurrently: select_for_update(skip_locked=True) prevents
double-processing when two instances run simultaneously.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def expire_pending_transfers() -> int:
    """
    Find all PENDING TRANSFER payments whose transfer_expires_at is in the past,
    transition them (and their linked Appointments) to FAILED/CANCELLED,
    and send expiry email notifications to tutors.

    Note: transfers with a receipt already uploaded are still expired if the
    doctor has not confirmed within 48 hours — doctor confirmation is required.

    Uses select_for_update(skip_locked=True) to prevent concurrent double-processing.

    Returns:
        int: Number of payments expired.
    """
    from apps.billing.models import Payment
    from apps.notifications.services.email_service import send_transfer_expired
    from apps.scheduling.models import Appointment

    now = timezone.now()
    count = 0

    with transaction.atomic():
        expired_payments = Payment.objects.select_for_update(skip_locked=True).filter(
            payment_method=Payment.TRANSFER,
            status=Payment.PENDING,
            transfer_expires_at__lte=now,
        )

        for payment in expired_payments:
            payment.status = Payment.FAILED
            payment.save(update_fields=["status", "updated_at"])

            appointment = None
            try:
                appointment = payment.appointment
                if appointment:
                    appointment.status = Appointment.CANCELLED
                    appointment.save(update_fields=["status", "updated_at"])
            except Exception as exc:
                logger.warning(
                    "expire_pending_transfers: could not cancel Appointment for Payment #%s: %s",
                    payment.pk,
                    exc,
                )

            count += 1
            logger.info(
                "Payment #%s expired (transfer_expires_at=%s, receipt_uploaded=%s)",
                payment.pk,
                payment.transfer_expires_at,
                bool(payment.receipt_uploaded_at),
            )

            try:
                send_transfer_expired(payment)
            except Exception as exc:
                logger.error(
                    "expire_pending_transfers: send_transfer_expired failed for Payment #%s: %s",
                    payment.pk,
                    exc,
                )

    logger.info("expire_pending_transfers: %d payment(s) expired", count)
    return count
