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
    consultation**: working hours from ALL active locations of the service's
    practice are merged, and only online appointments count as conflicts.
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

    if not is_online:
        working_hours_qs = WorkingHours.objects.filter(
            location=location,
            day_of_week=day_of_week,
            is_active=True,
        )
        if not working_hours_qs.exists():
            return []
    else:
        # Online: build slots AFTER all presential hours end + 1h rest
        all_wh = WorkingHours.objects.filter(
            location__practice=practice,
            location__is_active=True,
            day_of_week=day_of_week,
            is_active=True,
        )
        if not all_wh.exists():
            return []

    date_start = timezone.make_aware(datetime.datetime.combine(date, datetime.time.min))
    date_end = timezone.make_aware(datetime.datetime.combine(date, datetime.time.max))

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

    appt_filter = Appointment.objects.filter(
        scheduled_date=date,
    ).exclude(status__in=Appointment.SLOT_FREE_STATUSES)
    if is_online:
        appt_filter = appt_filter.filter(is_online=True)
    else:
        appt_filter = appt_filter.filter(location=location)
    existing_appointments = list(appt_filter)

    duration = datetime.timedelta(minutes=service.duration_minutes)
    slots: list[dict[str, Any]] = []

    if is_online:
        # Find the latest end_time across all presential working hours
        latest_end = max(wh.end_time for wh in all_wh)
        # 1 hour rest after presential, then 2 hours of online window
        rest = datetime.timedelta(hours=1)
        online_window = datetime.timedelta(hours=2)
        online_start = datetime.datetime.combine(date, latest_end) + rest
        online_end = online_start + online_window

        # Also collect all presential time ranges to exclude gaps overlap
        presential_ranges: list[tuple[datetime.time, datetime.time]] = []
        for wh in all_wh:
            presential_ranges.append((wh.start_time, wh.end_time))

        current = online_start
        while current + duration <= online_end:
            slot_start = current.time()
            slot_end = (current + duration).time()
            slot_key = slot_start.strftime("%H:%M")

            is_blocked = _check_blocked(slot_start, slot_end, blocked_slots, existing_appointments)

            if not is_blocked:
                slots.append({
                    "start_time": slot_key,
                    "end_time": slot_end.strftime("%H:%M"),
                    "available": True,
                })

            current += duration
    else:
        for wh in working_hours_qs:
            current = datetime.datetime.combine(date, wh.start_time)
            end_boundary = datetime.datetime.combine(date, wh.end_time)

            while current + duration <= end_boundary:
                slot_start = current.time()
                slot_end = (current + duration).time()
                slot_key = slot_start.strftime("%H:%M")

                is_blocked = _check_blocked(slot_start, slot_end, blocked_slots, existing_appointments)

                if not is_blocked:
                    slots.append({
                        "start_time": slot_key,
                        "end_time": slot_end.strftime("%H:%M"),
                        "available": True,
                    })

                current += duration

    slots.sort(key=lambda s: s["start_time"])
    return slots


def _check_blocked(
    slot_start: datetime.time,
    slot_end: datetime.time,
    blocked_slots: list,
    existing_appointments: list,
) -> bool:
    """Check if a slot conflicts with blocked slots or existing appointments."""
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
