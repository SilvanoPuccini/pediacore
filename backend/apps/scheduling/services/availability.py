from __future__ import annotations

import datetime
from typing import Any

from django.db.models import Q
from django.utils import timezone


def get_available_slots(
    location_id: int,
    service_id: int,
    date: datetime.date,
) -> list[dict[str, Any]]:
    from apps.practice.models import BlockedSlot, Location, Service, WorkingHours
    from apps.scheduling.models import Appointment

    try:
        location = Location.objects.get(pk=location_id, is_active=True)
        service = Service.objects.get(pk=service_id, is_active=True)
    except (Location.DoesNotExist, Service.DoesNotExist):
        return []

    day_of_week = date.weekday()
    working_hours_qs = WorkingHours.objects.filter(
        location=location,
        day_of_week=day_of_week,
        is_active=True,
    )
    if not working_hours_qs.exists():
        return []

    date_start = timezone.make_aware(datetime.datetime.combine(date, datetime.time.min))
    date_end = timezone.make_aware(datetime.datetime.combine(date, datetime.time.max))

    blocked_slots = list(
        BlockedSlot.objects.filter(
            practice=location.practice,
            start_datetime__lt=date_end,
            end_datetime__gt=date_start,
        ).filter(
            Q(location=location) | Q(location__isnull=True)
        )
    )

    existing_appointments = list(
        Appointment.objects.filter(
            location=location,
            scheduled_date=date,
        ).exclude(status=Appointment.CANCELLED)
    )

    duration = datetime.timedelta(minutes=service.duration_minutes)
    slots: list[dict[str, Any]] = []

    for wh in working_hours_qs:
        current = datetime.datetime.combine(date, wh.start_time)
        end_boundary = datetime.datetime.combine(date, wh.end_time)

        while current + duration <= end_boundary:
            slot_start = current.time()
            slot_end = (current + duration).time()

            is_blocked = False

            for blocked in blocked_slots:
                bs_start = blocked.start_datetime
                bs_end = blocked.end_datetime
                if timezone.is_aware(bs_start):
                    bs_start = timezone.localtime(bs_start).replace(tzinfo=None)
                if timezone.is_aware(bs_end):
                    bs_end = timezone.localtime(bs_end).replace(tzinfo=None)

                blocked_start_time = bs_start.time()
                blocked_end_time = bs_end.time()

                if blocked_start_time < slot_end and blocked_end_time > slot_start:
                    is_blocked = True
                    break

            if not is_blocked:
                for appt in existing_appointments:
                    if appt.start_time < slot_end and appt.end_time > slot_start:
                        is_blocked = True
                        break

            if not is_blocked:
                slots.append(
                    {
                        "start_time": slot_start.strftime("%H:%M"),
                        "end_time": slot_end.strftime("%H:%M"),
                        "available": True,
                    }
                )

            current += duration

    return slots
