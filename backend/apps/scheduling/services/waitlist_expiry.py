"""
Waitlist offer expiry service for PEDIACORE.

Expires OFFERED waitlist entries whose offer_expires_at has passed.
When an offer expires:
  1. The linked appointment transitions to EXPIRED
  2. The linked payment transitions to FAILED
  3. The waitlist entry goes back to WAITING
  4. **CASCADE**: The system automatically offers to the next candidate in the queue

Designed to be called by django-q2 scheduled task (one-shot per offer).
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def expire_waitlist_offer(entry_id: int, force: bool = False) -> bool:
    """
    Expire a single waitlist offer if it's still in OFFERED status.

    Args:
        entry_id: The WaitlistEntry PK.
        force: If True, skip the expiry-time check (used for manual decline).

    Returns True if the offer was expired, False otherwise.
    """
    from apps.billing.models import Payment
    from apps.scheduling.models import Appointment, WaitlistEntry

    with transaction.atomic():
        try:
            entry = WaitlistEntry.objects.select_for_update().get(pk=entry_id)
        except WaitlistEntry.DoesNotExist:
            logger.warning("expire_waitlist_offer: entry #%s not found", entry_id)
            return False

        if entry.status != WaitlistEntry.OFFERED:
            logger.info("expire_waitlist_offer: entry #%s is %s, skipping", entry_id, entry.status)
            return False

        if not force:
            now = timezone.now()
            if entry.offer_expires_at and entry.offer_expires_at > now:
                logger.info("expire_waitlist_offer: entry #%s not yet expired", entry_id)
                return False

        # Expire the linked appointment
        expired_appointment = None
        if entry.offered_appointment:
            appointment = Appointment.objects.select_for_update().get(pk=entry.offered_appointment_id)
            if appointment.status in (Appointment.HOLD, Appointment.PENDING):
                appointment.status = Appointment.EXPIRED
                appointment.save(update_fields=["status", "updated_at"])
                expired_appointment = appointment

                # Expire linked payment
                try:
                    payment = Payment.objects.select_for_update().get(appointment=appointment)
                    if payment.status == Payment.PENDING:
                        payment.status = Payment.FAILED
                        payment.save(update_fields=["status", "updated_at"])
                except Payment.DoesNotExist:
                    pass

        # Return entry to WAITING
        entry.status = WaitlistEntry.WAITING
        entry.offer_expires_at = None
        entry.offered_appointment = None
        entry.save(update_fields=["status", "offer_expires_at", "offered_appointment", "updated_at"])

    logger.info("expire_waitlist_offer: entry #%s expired, returned to WAITING", entry_id)
    return True


def expire_and_cascade(entry_id: int, force: bool = False) -> None:
    """
    Expire a waitlist offer and cascade to the next candidate.

    This is the function scheduled by django-q2 for each auto-offer.
    After expiring the current offer, it calls auto_offer_freed_slot
    to offer the same slot to the next person in the queue.

    Args:
        entry_id: The WaitlistEntry PK.
        force: If True, skip the expiry-time check (used for manual decline).
    """
    from apps.scheduling.models import Appointment, WaitlistEntry

    # First, check the entry to get appointment info BEFORE expiring
    try:
        entry = WaitlistEntry.objects.select_related("offered_appointment").get(pk=entry_id)
    except WaitlistEntry.DoesNotExist:
        logger.warning("expire_and_cascade: entry #%s not found", entry_id)
        return

    if entry.status != WaitlistEntry.OFFERED:
        logger.info("expire_and_cascade: entry #%s is %s (already handled), skipping", entry_id, entry.status)
        return

    # Save appointment details for cascade before expiring
    offered_appt = entry.offered_appointment
    if not offered_appt:
        expire_waitlist_offer(entry_id, force=force)
        return

    # We need a "template" appointment to know the slot details (date, time, service, location)
    # The offered_appointment has these details
    slot_date = offered_appt.scheduled_date
    slot_time = offered_appt.start_time
    service = offered_appt.service
    location = offered_appt.location
    practice = offered_appt.practice

    # Expire the current offer
    expired = expire_waitlist_offer(entry_id, force=force)
    if not expired:
        return

    # Cascade: create a lightweight "template" to pass to auto_offer_freed_slot
    # We need an appointment-like object with the slot info
    # The original appointment was expired, so we create a simple namespace
    class _SlotRef:
        """Lightweight slot reference for cascade."""
        pass

    slot_ref = _SlotRef()
    slot_ref.pk = offered_appt.pk
    slot_ref.scheduled_date = slot_date
    slot_ref.start_time = slot_time
    slot_ref.service = service
    slot_ref.service_id = service.pk
    slot_ref.location = location
    slot_ref.location_id = location.pk if location else None
    slot_ref.practice = practice

    from apps.scheduling.services.waitlist import auto_offer_freed_slot

    # Skip the entry that just expired (it's back to WAITING but shouldn't be re-offered immediately)
    next_entry = auto_offer_freed_slot(
        slot_ref,
        skip_entry_ids=[entry_id],
    )

    if next_entry:
        logger.info(
            "expire_and_cascade: cascaded from entry #%s to entry #%s",
            entry_id,
            next_entry.pk,
        )
    else:
        logger.info(
            "expire_and_cascade: no more candidates after entry #%s",
            entry_id,
        )


def expire_all_waitlist_offers() -> int:
    """
    Bulk expire all OFFERED waitlist entries whose offer_expires_at is in the past.
    Designed to be run as a periodic safety-net task.

    Returns the number of offers expired.
    """
    from apps.scheduling.models import WaitlistEntry

    now = timezone.now()
    expired_entries = WaitlistEntry.objects.filter(
        status=WaitlistEntry.OFFERED,
        offer_expires_at__lt=now,
    )

    count = 0
    for entry in expired_entries:
        expire_and_cascade(entry.pk)
        count += 1

    logger.info("expire_all_waitlist_offers: %d offer(s) processed", count)
    return count
