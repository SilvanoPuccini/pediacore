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

    # Today's appointments as a list (reused for calendar slots)
    todays_list = list(
        Appointment.objects.filter(scheduled_date=today)
        .select_related("patient", "service", "location")
        .exclude(status__in=[Appointment.CANCELLED, Appointment.EXPIRED])
        .order_by("start_time")[:10]
    )

    # Build timeline slots from 08:00 to 20:00 for today's appointments
    calendar_hours = []
    for hour in range(8, 21):
        apts_in_hour = [
            a for a in todays_list
            if a.start_time and a.start_time.hour == hour
        ]
        calendar_hours.append({
            "hour": f"{hour:02d}:00",
            "appointments": apts_in_hour,
            "has_appointments": len(apts_in_hour) > 0,
        })

    # Monthly goals (configurable targets)
    MONTHLY_TARGETS = {
        "patients_target": 10,      # New patients per month
        "revenue_target": 500_000,  # CLP target
        "appointments_target": 80,  # Appointments per month
    }

    new_patients_month = Patient.objects.filter(
        is_active=True,
        created_at__date__gte=month_start,
    ).count()

    appointments_month = Appointment.objects.filter(
        scheduled_date__gte=month_start,
    ).exclude(status__in=[Appointment.CANCELLED, Appointment.EXPIRED]).count()

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
            "todays_appointments": todays_list,
            "calendar_hours": calendar_hours,
            "monthly_goals": [
                {
                    "title": "Pacientes nuevos",
                    "current": new_patients_month,
                    "target": MONTHLY_TARGETS["patients_target"],
                    "percentage": min(100, int((new_patients_month / max(1, MONTHLY_TARGETS["patients_target"])) * 100)),
                    "icon": "person_add",
                },
                {
                    "title": "Ingresos",
                    "current": f"${monthly_revenue:,.0f}",
                    "target": f"${MONTHLY_TARGETS['revenue_target']:,.0f}",
                    "percentage": min(100, int((monthly_revenue / max(1, MONTHLY_TARGETS["revenue_target"])) * 100)),
                    "icon": "payments",
                },
                {
                    "title": "Consultas",
                    "current": appointments_month,
                    "target": MONTHLY_TARGETS["appointments_target"],
                    "percentage": min(100, int((appointments_month / max(1, MONTHLY_TARGETS["appointments_target"])) * 100)),
                    "icon": "stethoscope",
                },
            ],
        }
    )
    return context
