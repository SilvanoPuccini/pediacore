"""
Token service for PEDIACORE.

Handles creation, validation, and execution of AppointmentToken records.
Tokens enable tutors to perform appointment actions (confirm/cancel/reschedule)
via secure email links without requiring portal authentication.
"""

from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING

from django.conf import settings
from django.utils import timezone

if TYPE_CHECKING:
    from apps.scheduling.models import Appointment, AppointmentToken

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class TokenNotFoundError(Exception):
    """Raised when a token string does not exist in the database."""


class TokenExpiredError(Exception):
    """Raised when a token's expires_at is in the past."""


class TokenUsedError(Exception):
    """Raised when a token has already been consumed (used_at is set)."""


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------


def invalidate_appointment_tokens(appointment: Appointment) -> int:
    """
    Bulk-invalidate all unused tokens for an appointment.

    Sets used_at=now() on every AppointmentToken that hasn't been consumed yet.
    Called by reschedule_service after a reschedule and by execute_token_action
    after a successful cancel-via-token.

    Args:
        appointment: The Appointment whose unused tokens should be invalidated.

    Returns:
        Number of tokens that were invalidated.
    """
    from apps.scheduling.models import AppointmentToken

    count = AppointmentToken.objects.filter(
        appointment=appointment,
        used_at__isnull=True,
    ).update(used_at=timezone.now())

    logger.debug(
        "invalidate_appointment_tokens: invalidated %s tokens for Appointment #%s",
        count,
        appointment.pk,
    )
    return count


def create_tokens_for_appointment(appointment: Appointment) -> list[AppointmentToken]:
    """
    Create CONFIRM, CANCEL, and RESCHEDULE tokens for an appointment.

    Idempotent: if tokens already exist for this appointment, returns the
    existing ones without creating duplicates.

    Args:
        appointment: The Appointment instance to generate tokens for.

    Returns:
        List of 3 AppointmentToken instances.
    """
    from apps.scheduling.models import AppointmentToken

    existing = list(AppointmentToken.objects.filter(appointment=appointment))
    if existing:
        logger.debug(
            "create_tokens_for_appointment: tokens already exist for Appointment #%s — skipping",
            appointment.pk,
        )
        return existing

    ttl_hours = getattr(settings, "APPOINTMENT_TOKEN_EXPIRY_HOURS", 72)
    expires_at = timezone.now() + timezone.timedelta(hours=ttl_hours)

    tokens = []
    for action in (AppointmentToken.CONFIRM, AppointmentToken.CANCEL, AppointmentToken.RESCHEDULE):
        token = AppointmentToken.objects.create(
            appointment=appointment,
            practice=appointment.practice,
            token=uuid.uuid4().hex,
            action=action,
            expires_at=expires_at,
        )
        tokens.append(token)
        logger.debug(
            "create_tokens_for_appointment: created %s token for Appointment #%s",
            action,
            appointment.pk,
        )

    return tokens


def validate_token(token_str: str) -> AppointmentToken:
    """
    Look up a token and verify it is valid (not expired, not used).

    Args:
        token_str: The raw token string from the URL.

    Returns:
        The AppointmentToken instance if valid.

    Raises:
        TokenNotFoundError: Token string does not exist.
        TokenExpiredError: Token has passed its expires_at.
        TokenUsedError: Token has already been consumed.
    """
    from apps.scheduling.models import AppointmentToken

    try:
        token = AppointmentToken.objects.select_related("appointment", "appointment__practice").get(
            token=token_str
        )
    except AppointmentToken.DoesNotExist:
        raise TokenNotFoundError(f"Token not found: {token_str}")

    if token.used_at is not None:
        raise TokenUsedError(f"Token already used at {token.used_at}")

    if token.expires_at <= timezone.now():
        raise TokenExpiredError(f"Token expired at {token.expires_at}")

    return token


def execute_token_action(token_str: str) -> dict:
    """
    Validate a token and execute its associated action.

    Phase 3 behaviour:
    - CONFIRM: sets attendance_confirmed=True, via=EMAIL, confirmed_at=now(), marks token used.
    - CANCEL: returns deferred response WITHOUT consuming the token.
    - RESCHEDULE: returns deferred response WITHOUT consuming the token.

    Args:
        token_str: The raw token string from the URL.

    Returns:
        dict with keys: success (bool), action (str), status (str), message (str).

    Raises:
        TokenNotFoundError, TokenExpiredError, TokenUsedError — from validate_token.
    """
    token = validate_token(token_str)
    appointment = token.appointment

    if token.action == token.CONFIRM:
        now = timezone.now()
        appointment.attendance_confirmed = True
        appointment.attendance_confirmed_at = now
        appointment.attendance_confirmed_via = "EMAIL"
        appointment.save(
            update_fields=[
                "attendance_confirmed",
                "attendance_confirmed_at",
                "attendance_confirmed_via",
                "updated_at",
            ]
        )

        token.used_at = now
        token.save(update_fields=["used_at"])

        logger.info(
            "execute_token_action: CONFIRM executed for Appointment #%s",
            appointment.pk,
        )
        return {
            "success": True,
            "action": token.action,
            "status": "confirmed",
            "message": "Your attendance has been confirmed.",
        }

    if token.action == token.CANCEL:
        from apps.scheduling.models import Appointment

        if appointment.status not in (Appointment.CONFIRMED, Appointment.HOLD, Appointment.PENDING):
            return {
                "success": False,
                "action": "CANCEL",
                "reason": "APPOINTMENT_NOT_CANCELLABLE",
                "message": f"Appointment cannot be cancelled (status: {appointment.status}).",
            }

        from apps.billing.services.payment_strategy import PaymentRefundError
        from apps.scheduling.services.cancellation import cancel_appointment

        try:
            result = cancel_appointment(appointment, reason="Cancelled via email link")
        except PaymentRefundError:
            # Cancel anyway without refund if provider fails
            result = cancel_appointment(appointment, reason="Cancelled via email link", refund=False)

        token.used_at = timezone.now()
        token.save(update_fields=["used_at"])

        logger.info(
            "execute_token_action: CANCEL executed for Appointment #%s",
            appointment.pk,
        )
        return {
            "success": True,
            "action": token.CANCEL,
            "appointment_id": appointment.pk,
            "status": "cancelled",
            "refund_info": result.get("refund_info"),
        }

    # RESCHEDULE: return a redirect URL — do NOT consume the token
    # (user still needs to pick a new slot in the frontend)
    reschedule_url = f"{settings.SITE_URL}/portal/appointments/{appointment.pk}/reschedule"
    logger.info(
        "execute_token_action: RESCHEDULE redirect for Appointment #%s",
        appointment.pk,
    )
    return {
        "success": True,
        "action": token.RESCHEDULE,
        "appointment_id": appointment.pk,
        "status": "redirect",
        "reschedule_url": reschedule_url,
    }
