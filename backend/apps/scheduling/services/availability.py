from __future__ import annotations

import datetime
from typing import Any

from django.db.models import Q
from django.utils import timezone


def get_available_slots(
    location_id: int | None,
    service_id: int,
    date: datetime.date,
) -> list[dict[str, Any]]:
    """Return available time slots for a given service+date.

    When ``location_id`` is ``None`` the request is treated as an **online
    consultation**: working hours blocks with ``is_online=True`` are used.

    Smart clustering rule (< 24 h away):
    - If exactly 1 appointment already exists for that day+location, return only
      the 3 adjacent free slots around it instead of the full free list.
    - If 0 or 2+ appointments exist, return all free slots normally.
    """
    from apps.practice.models import BlockedSlot, Location, Service, WorkingHours
    from apps.scheduling.models import Appointment

    try:
        service = Service.objects.get(pk=service_id, is_active=True)
    except Service.DoesNotExist:
        return []

    is_online = location_id is None

    if is_online:
        location = None
        practice = service.practice
    else:
        try:
            location = Location.objects.get(pk=location_id, is_active=True)
        except Location.DoesNotExist:
            return []
        practice = location.practice

    day_of_week = date.weekday()

    # Fetch relevant working hours blocks
    if is_online:
        working_hours_qs = WorkingHours.objects.filter(
            practice=practice,
            is_online=True,
            day_of_week=day_of_week,
            is_active=True,
        )
    else:
        working_hours_qs = WorkingHours.objects.filter(
            location=location,
            is_online=False,
            day_of_week=day_of_week,
            is_active=True,
        )

    if not working_hours_qs.exists():
        return []

    date_start = timezone.make_aware(datetime.datetime.combine(date, datetime.time.min))
    date_end = timezone.make_aware(datetime.datetime.combine(date, datetime.time.max))

    # Blocked slots for this date + context
    blocked_filter = BlockedSlot.objects.filter(
        practice=practice,
        start_datetime__lt=date_end,
        end_datetime__gt=date_start,
    )
    if is_online:
        blocked_filter = blocked_filter.filter(location__isnull=True)
    else:
        blocked_filter = blocked_filter.filter(
            Q(location=location) | Q(location__isnull=True)
        )
    blocked_slots = list(blocked_filter)

    # Existing booked appointments
    appt_filter = Appointment.objects.filter(
        scheduled_date=date,
    ).exclude(status__in=Appointment.SLOT_FREE_STATUSES)
    if is_online:
        appt_filter = appt_filter.filter(is_online=True)
    else:
        appt_filter = appt_filter.filter(location=location)
    existing_appointments = list(appt_filter)

    # Generate all free slots across all working hours blocks for this day
    slots: list[dict[str, Any]] = []

    for wh in working_hours_qs:
        duration = datetime.timedelta(minutes=wh.slot_duration_minutes)

        # Count booked appointments for this block to enforce max_appointments
        block_start_dt = datetime.datetime.combine(date, wh.start_time)
        block_end_dt = datetime.datetime.combine(date, wh.end_time)
        booked_in_block = [
            a for a in existing_appointments
            if datetime.datetime.combine(date, a.start_time) >= block_start_dt
            and datetime.datetime.combine(date, a.start_time) < block_end_dt
        ]
        if len(booked_in_block) >= wh.max_appointments:
            # Block is full — skip entirely
            continue

        current = block_start_dt
        while current + duration <= block_end_dt:
            slot_start = current.time()
            slot_end = (current + duration).time()

            # Skip slots that overlap with the break window
            if wh.break_start and wh.break_end:
                if slot_start < wh.break_end and slot_end > wh.break_start:
                    current += duration
                    continue

            # Skip slots blocked by BlockedSlot or existing appointments
            if not _check_blocked(slot_start, slot_end, blocked_slots, existing_appointments):
                slots.append({
                    "start_time": slot_start.strftime("%H:%M"),
                    "end_time": slot_end.strftime("%H:%M"),
                    "available": True,
                })

            current += duration

    slots.sort(key=lambda s: s["start_time"])

    now = timezone.localtime(timezone.now())

    # 4-hour sliding window for presencial only, when agenda is empty:
    # earliest bookable slot = now + 4h (skip lunch breaks naturally)
    if not is_online and len(existing_appointments) == 0:
        earliest = (now + datetime.timedelta(hours=4)).time().strftime("%H:%M")
        slots = [s for s in slots if s["start_time"] >= earliest]

    # Smart clustering: presencial only, <24h away, exactly 1 existing appointment
    if not is_online:
        date_as_dt = datetime.datetime.combine(date, datetime.time.min)
        hours_until = (date_as_dt - now.replace(tzinfo=None)).total_seconds() / 3600

        if hours_until < 24 and len(existing_appointments) == 1:
            slots = _apply_clustering(slots, existing_appointments[0])

    return slots


def _apply_clustering(
    free_slots: list[dict[str, Any]],
    anchor_appointment,
) -> list[dict[str, Any]]:
    """Return 3 strategic free slots around the single existing appointment.

    Strategy: 2 adjacent slots + 1 extreme opposite slot.
    - Anchor at START  → 2 after + 1 last (extreme end of day)
    - Anchor at END    → 2 before + 1 first (extreme start of day)
    - Anchor in MIDDLE → 1 before + 1 after + 1 extreme (farthest side)
    """
    if not free_slots:
        return free_slots

    anchor_start = anchor_appointment.start_time.strftime("%H:%M")

    # Find the pivot: index of first free slot after the anchor
    pivot = 0
    for i, slot in enumerate(free_slots):
        if slot["start_time"] > anchor_start:
            pivot = i
            break
    else:
        pivot = len(free_slots)

    slots_before = free_slots[:pivot]
    slots_after = free_slots[pivot:]

    is_at_start = len(slots_before) == 0
    is_at_end = len(slots_after) == 0

    result: list[dict[str, Any]] = []

    if is_at_start:
        # Anchor at start: 2 adjacent after + 1 extreme (last of day)
        result = slots_after[:2]
        if len(slots_after) > 2:
            result.append(slots_after[-1])
    elif is_at_end:
        # Anchor at end: 2 adjacent before + 1 extreme (first of day)
        result = slots_before[-2:]
        if len(slots_before) > 2:
            result.insert(0, slots_before[0])
    else:
        # Anchor in middle: 1 before + 1 after (adjacent pair)
        adjacent = slots_before[-1:] + slots_after[:1]
        # Extreme = farthest available slot from anchor
        if len(slots_before) >= len(slots_after):
            extreme = [slots_before[0]]
        else:
            extreme = [slots_after[-1]]
        # Avoid duplicates if extreme is already in adjacent
        for s in extreme:
            if s not in adjacent:
                adjacent.append(s)
        result = adjacent

    # Sort by time and cap at 3
    result.sort(key=lambda s: s["start_time"])
    return result[:3]


def _check_blocked(
    slot_start: datetime.time,
    slot_end: datetime.time,
    blocked_slots: list,
    existing_appointments: list,
) -> bool:
    """Return True if the slot conflicts with any blocked slot or existing appointment."""
    for blocked in blocked_slots:
        bs_start = blocked.start_datetime
        bs_end = blocked.end_datetime
        if timezone.is_aware(bs_start):
            bs_start = timezone.localtime(bs_start).replace(tzinfo=None)
        if timezone.is_aware(bs_end):
            bs_end = timezone.localtime(bs_end).replace(tzinfo=None)

        if bs_start.time() < slot_end and bs_end.time() > slot_start:
            return True

    for appt in existing_appointments:
        if appt.start_time < slot_end and appt.end_time > slot_start:
            return True

    return False
