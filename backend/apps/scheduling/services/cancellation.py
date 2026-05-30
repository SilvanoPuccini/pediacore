from __future__ import annotations

import datetime
import logging
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.utils import timezone

from apps.billing.services.payment_strategy import PaymentRefundError, get_payment_strategy
from apps.notifications.services.email_service import send_appointment_cancellation
from apps.scheduling.services.token_service import invalidate_appointment_tokens

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser

    from apps.scheduling.models import Appointment

logger = logging.getLogger(__name__)


def get_cancellation_penalty(appointment: Appointment) -> dict[str, Any]:
    from apps.scheduling.models import CancellationPolicy

    now = timezone.now()
    appointment_dt = timezone.make_aware(
        datetime.datetime.combine(appointment.scheduled_date, appointment.start_time)
    )
    hours_until = (appointment_dt - now).total_seconds() / 3600.0

    try:
        policy = CancellationPolicy.objects.get(
            practice=appointment.practice,
            is_active=True,
        )
    except CancellationPolicy.DoesNotExist:
        return {
            "penalty_percentage": Decimal("0.00"),
            "tier_description": "No cancellation policy",
            "hours_until": hours_until,
        }

    applicable_tier = None
    for tier in policy.tiers.order_by("-min_hours_before"):
        if hours_until >= tier.min_hours_before:
            applicable_tier = tier
            break

    if applicable_tier is None:
        if policy.tiers.exists():
            applicable_tier = policy.tiers.order_by("min_hours_before").first()

    if applicable_tier is None:
        return {
            "penalty_percentage": Decimal("0.00"),
            "tier_description": "No tiers configured",
            "hours_until": hours_until,
        }

    return {
        "penalty_percentage": applicable_tier.penalty_percentage,
        "tier_description": applicable_tier.description,
        "hours_until": hours_until,
    }


def cancel_appointment(
    appointment: Appointment,
    reason: str = "",
    refund: bool = True,
    cancelled_by: AbstractUser | None = None,
) -> dict[str, Any]:
    """
    Cancel an appointment and optionally process a refund.

    Enhanced behaviour (Phase 4):
    - Computes cancellation penalty via get_cancellation_penalty().
    - If refund=True and a COMPLETED payment exists with refund_amount > 0:
      - Calls strategy.refund(payment, refund_amount).
      - Updates payment.status = REFUNDED.
      - Stores refund metadata in payment.metadata["refund"].
    - Always calls send_appointment_cancellation() after a successful cancel.
    - Calls notify_waitlist_on_cancellation() (preserved from original).

    Args:
        appointment: The Appointment to cancel.
        reason: Optional cancellation reason text.
        refund: Whether to attempt a refund (default True).
        cancelled_by: Optional user who triggered the cancellation.

    Returns:
        dict with keys:
            - appointment: the cancelled Appointment instance
            - refund_info: dict with refund details, or None if no refund was made

    Raises:
        PaymentRefundError: If the payment provider rejects the refund.
    """
    from apps.billing.models import Payment
    from apps.scheduling.models import Appointment as AppointmentModel
    from apps.scheduling.services.waitlist import notify_waitlist_on_cancellation

    refund_info: dict | None = None

    # --- Refund logic ---
    if refund:
        # Get the associated payment (if any)
        payment = None
        try:
            payment = Payment.objects.get(appointment=appointment, status=Payment.COMPLETED)
        except Payment.DoesNotExist:
            pass

        if payment is not None:
            penalty_data = get_cancellation_penalty(appointment)
            penalty_pct = int(penalty_data["penalty_percentage"])
            refund_pct = 100 - penalty_pct
            refund_amount = int(Decimal(str(payment.amount)) * refund_pct / 100)

            if refund_amount > 0:
                strategy = get_payment_strategy(payment.payment_method)
                refund_result = strategy.refund(payment, refund_amount)

                # Update payment status and metadata
                now_iso = timezone.now().isoformat()
                payment.status = Payment.REFUNDED
                payment.metadata["refund"] = {
                    "refund_id": refund_result.get("refund_id"),
                    "refund_amount": refund_amount,
                    "refunded_at": now_iso,
                    "penalty_percentage": penalty_pct,
                }
                payment.save(update_fields=["status", "metadata", "updated_at"])

                refund_info = {
                    "refund_id": refund_result.get("refund_id"),
                    "refund_amount": refund_amount,
                    "penalty_percentage": penalty_pct,
                }

                logger.info(
                    "cancel_appointment: refund of %s CLP processed for Payment #%s (penalty=%s%%)",
                    refund_amount,
                    payment.pk,
                    penalty_pct,
                )
            else:
                logger.info(
                    "cancel_appointment: no refund (penalty=100%%) for Payment #%s — appointment stays COMPLETED",
                    payment.pk,
                )

    # --- Cancel the appointment ---
    appointment.status = AppointmentModel.CANCELLED
    appointment.cancelled_at = timezone.now()
    appointment.cancellation_reason = reason
    appointment.save(update_fields=["status", "cancelled_at", "cancellation_reason", "updated_at"])

    logger.info(
        "cancel_appointment: Appointment #%s cancelled by %s (reason=%r)",
        appointment.pk,
        cancelled_by,
        reason,
    )

    # --- Notify waitlist (preserved behaviour) ---
    notify_waitlist_on_cancellation(appointment)

    # --- Send cancellation email to tutors (previously missing — fixed here) ---
    send_appointment_cancellation(appointment)

    # --- Invalidate all unused tokens for this appointment ---
    invalidate_appointment_tokens(appointment)

    return {
        "appointment": appointment,
        "refund_info": refund_info,
    }
