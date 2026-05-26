from __future__ import annotations

import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.utils import timezone

if TYPE_CHECKING:
    from apps.scheduling.models import Appointment


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


def cancel_appointment(appointment: Appointment, reason: str = "") -> Appointment:
    from apps.scheduling.models import Appointment as AppointmentModel

    appointment.status = AppointmentModel.CANCELLED
    appointment.cancelled_at = timezone.now()
    appointment.cancellation_reason = reason
    appointment.save(update_fields=["status", "cancelled_at", "cancellation_reason", "updated_at"])
    return appointment
