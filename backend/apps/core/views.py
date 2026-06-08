"""
Dashboard API views for PEDIACORE.

Aggregates data across multiple apps (scheduling, billing, patients) to provide
doctor-facing dashboard endpoints.

All endpoints require IsDoctor permission.
"""
from __future__ import annotations

import datetime
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Payment
from apps.core.permissions import IsDoctor
from apps.core.serializers import (
    DashboardMetricsSerializer,
    ReminderSerializer,
    RevenuePointSerializer,
)
from apps.patients.models import Patient
from apps.scheduling.models import Appointment


class DashboardMetricsView(APIView):
    """
    GET /api/v1/dashboard/metrics/

    Returns aggregated metrics for the doctor dashboard.
    Optional query param: ?location_id=<int>

    Response:
        today_count: appointments scheduled for today
        week_count: appointments scheduled this calendar week (Mon-Sun)
        month_revenue: sum of COMPLETED payments this calendar month
        no_show_rate: fraction of NO_SHOW appointments in the last 30 days (0-1)
        pending_count: appointments with status PENDING or HOLD
    """

    permission_classes = [IsDoctor]

    def get(self, request: Request) -> Response:
        location_id = request.query_params.get("location_id")

        today = datetime.date.today()
        # Week boundaries: Monday to Sunday
        week_start = today - datetime.timedelta(days=today.weekday())
        week_end = week_start + datetime.timedelta(days=6)
        # Month boundaries
        month_start = today.replace(day=1)
        # 30-day window for no_show_rate
        thirty_days_ago = today - datetime.timedelta(days=30)

        # Base queryset filter
        location_filter: dict = {}
        if location_id:
            try:
                location_filter["location_id"] = int(location_id)
            except (ValueError, TypeError):
                pass

        qs = Appointment.objects.filter(**location_filter)

        # today_count: active appointment statuses (not cancelled/expired/etc.)
        today_count = qs.filter(
            scheduled_date=today,
        ).exclude(
            status__in=[Appointment.CANCELLED, Appointment.EXPIRED, Appointment.RESCHEDULED]
        ).count()

        # week_count: same active statuses this week
        week_count = qs.filter(
            scheduled_date__range=(week_start, week_end),
        ).exclude(
            status__in=[Appointment.CANCELLED, Appointment.EXPIRED, Appointment.RESCHEDULED]
        ).count()

        # pending_count: PENDING or HOLD
        pending_count = qs.filter(
            status__in=[Appointment.PENDING, Appointment.HOLD],
        ).count()

        # month_revenue: sum of COMPLETED payments this month
        payment_qs = Payment.objects.filter(
            status=Payment.COMPLETED,
            paid_at__date__gte=month_start,
            paid_at__date__lte=today,
        )
        if location_id:
            try:
                payment_qs = payment_qs.filter(appointment__location_id=int(location_id))
            except (ValueError, TypeError):
                pass
        month_revenue_agg = payment_qs.aggregate(total=Sum("amount"))
        month_revenue = month_revenue_agg["total"] or Decimal("0.00")

        # no_show_rate: NO_SHOW / total in last 30 days
        recent_qs = qs.filter(
            scheduled_date__range=(thirty_days_ago, today),
        ).exclude(
            status__in=[Appointment.HOLD, Appointment.EXPIRED]
        )
        total_recent = recent_qs.count()
        no_show_count = recent_qs.filter(status=Appointment.NO_SHOW).count()
        no_show_rate = (no_show_count / total_recent) if total_recent > 0 else 0.0

        data = {
            "today_count": today_count,
            "week_count": week_count,
            "month_revenue": month_revenue,
            "no_show_rate": no_show_rate,
            "pending_count": pending_count,
        }
        serializer = DashboardMetricsSerializer(data)
        return Response(serializer.data)


class RevenueChartView(APIView):
    """
    GET /api/v1/dashboard/revenue-chart/

    Returns daily revenue for the last N days (default 30).
    Zero-filled: all days are included even if no payments.

    Query params:
        days: int (default 30)
        location_id: int (optional)

    Response: [{day: "YYYY-MM-DD", ingreso: Decimal}, ...] ordered ascending
    """

    permission_classes = [IsDoctor]

    def get(self, request: Request) -> Response:
        try:
            days = int(request.query_params.get("days", 30))
        except (ValueError, TypeError):
            days = 30

        location_id = request.query_params.get("location_id")

        today = datetime.date.today()
        date_range_start = today - datetime.timedelta(days=days - 1)

        # Query completed payments within the range
        payment_qs = Payment.objects.filter(
            status=Payment.COMPLETED,
            paid_at__date__gte=date_range_start,
            paid_at__date__lte=today,
        )
        if location_id:
            try:
                payment_qs = payment_qs.filter(
                    appointment__location_id=int(location_id)
                )
            except (ValueError, TypeError):
                pass

        # Build lookup: date -> total amount
        revenue_by_date: dict[datetime.date, Decimal] = {}
        for payment in payment_qs.values("paid_at", "amount"):
            d = payment["paid_at"].date() if hasattr(payment["paid_at"], "date") else payment["paid_at"]
            revenue_by_date[d] = revenue_by_date.get(d, Decimal("0.00")) + payment["amount"]

        # Build zero-filled list for all days in range
        result = []
        current = date_range_start
        while current <= today:
            result.append(
                {
                    "day": current,
                    "ingreso": revenue_by_date.get(current, Decimal("0.00")),
                }
            )
            current += datetime.timedelta(days=1)

        serializer = RevenuePointSerializer(result, many=True)
        return Response(serializer.data)


class RemindersView(APIView):
    """
    GET /api/v1/dashboard/reminders/

    Returns upcoming reminders for the doctor.
    Currently supports: birthday reminders (next 7 days).

    Query params:
        location_id: int (optional) — filter by patient's practice location

    Response: [{type, title, detail, patient_id}, ...] or []
    """

    permission_classes = [IsDoctor]

    def get(self, request: Request) -> Response:
        location_id = request.query_params.get("location_id")

        today = datetime.date.today()
        reminders = []

        # Birthday reminders: patients with birthday today or within next 7 days
        patient_qs = Patient.objects.filter(
            date_of_birth__isnull=False,
            is_active=True,
        )
        if location_id:
            try:
                loc_id = int(location_id)
                # Filter patients who have appointments at this location
                from apps.scheduling.models import Appointment as Appt
                patient_ids = Appt.objects.filter(
                    location_id=loc_id
                ).values_list("patient_id", flat=True).distinct()
                patient_qs = patient_qs.filter(id__in=patient_ids)
            except (ValueError, TypeError):
                pass

        for patient in patient_qs.select_related():
            dob = patient.date_of_birth
            # Check if birthday falls within today .. today+7
            for offset in range(8):
                check_date = today + datetime.timedelta(days=offset)
                try:
                    birthday_this_year = datetime.date(check_date.year, dob.month, dob.day)
                except ValueError:
                    # Feb 29 on non-leap year
                    continue
                if birthday_this_year == check_date:
                    age = check_date.year - dob.year
                    if offset == 0:
                        detail = f"Cumple {age} años hoy"
                    else:
                        detail = f"Cumple {age} años en {offset} día{'s' if offset > 1 else ''}"
                    reminders.append(
                        {
                            "type": "birthday",
                            "title": f"{patient.first_name} {patient.last_name}",
                            "detail": detail,
                            "patient_id": patient.id,
                        }
                    )
                    break  # Only add once per patient

        serializer = ReminderSerializer(reminders, many=True)
        return Response(serializer.data)
