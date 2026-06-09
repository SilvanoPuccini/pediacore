"""
Unfold admin dashboard callback for PEDIACORE.

Provides real KPIs and quick-access data for the admin dashboard.
"""

from __future__ import annotations

from django.db.models import Sum
from django.utils import timezone


def dashboard_callback(request, context):
    """Populate the Unfold admin dashboard with real KPIs and recent data."""
    from apps.billing.models import Payment
    from apps.patients.models import Patient
    from apps.scheduling.models import Appointment

    today = timezone.localdate()
    month_start = today.replace(day=1)

    # Monthly revenue — Payment.COMPLETED is the paid status
    monthly_revenue = (
        Payment.objects.filter(
            status=Payment.COMPLETED,
            paid_at__date__gte=month_start,
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    context.update(
        {
            "kpis": [
                {
                    "title": "Pacientes",
                    "value": Patient.objects.filter(is_active=True).count(),
                    "icon": "child_care",
                },
                {
                    "title": "Turnos hoy",
                    "value": Appointment.objects.filter(
                        scheduled_date=today
                    )
                    .exclude(status__in=[Appointment.CANCELLED, Appointment.EXPIRED])
                    .count(),
                    "icon": "calendar_month",
                },
                {
                    "title": "Ingresos mes",
                    "value": f"${monthly_revenue:,.0f}",
                    "icon": "payments",
                },
                {
                    "title": "Pendientes",
                    "value": Appointment.objects.filter(status=Appointment.PENDING).count(),
                    "icon": "hourglass_top",
                },
            ],
            "recent_patients": Patient.objects.filter(is_active=True).order_by("-created_at")[:5],
            "todays_appointments": Appointment.objects.filter(scheduled_date=today)
            .select_related("patient", "service", "location")
            .exclude(status__in=[Appointment.CANCELLED, Appointment.EXPIRED])
            .order_by("start_time")[:10],
        }
    )
    return context
