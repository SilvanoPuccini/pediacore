"""
Scheduled tasks for automatic alerts via django-q2.

These tasks are registered as periodic schedules via a data migration
in the notifications app (0003_register_alert_schedules).
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)


def check_vaccination_alerts() -> str:
    """
    Create notifications for patients under 2 years with no encounter in 2+ months.

    Runs daily. Finds young patients with no recent encounters and notifies their tutors.
    """
    from apps.notifications.models import Notification
    from apps.patients.models import Patient

    two_months_ago = timezone.now() - timedelta(days=60)
    cutoff_dob = timezone.localdate() - timedelta(days=730)  # 2 years ago

    patients = Patient.objects.filter(
        is_active=True,
        date_of_birth__gte=cutoff_dob,
    ).exclude(
        appointments__scheduled_date__gte=two_months_ago.date(),
    )

    created = 0
    for patient in patients:
        for tp in patient.tutor_patients.filter(deleted_at__isnull=True):
            _, new = Notification.objects.get_or_create(
                recipient=tp.tutor,
                notification_type=Notification.GENERAL,
                related_type="Patient",
                related_id=patient.pk,
                defaults={
                    "title": f"Control pendiente: {patient.full_name}",
                    "message": (
                        f"{patient.full_name} no tiene controles registrados en los últimos 2 meses. "
                        "Considere agendar una consulta."
                    ),
                    "practice": patient.practice,
                },
            )
            if new:
                created += 1

    logger.info("check_vaccination_alerts: created %d notifications", created)
    return f"Created {created} vaccination alerts"


def check_pending_payments() -> str:
    """
    Notify the doctor about PENDING payments older than 48 hours.

    Runs every 6 hours. Alerts users with role DOCTOR about overdue transfers.
    """
    from django.contrib.auth import get_user_model

    from apps.billing.models import Payment
    from apps.notifications.models import Notification

    User = get_user_model()
    cutoff = timezone.now() - timedelta(hours=48)

    pending = Payment.objects.filter(
        status=Payment.PENDING,
        created_at__lte=cutoff,
    ).select_related("appointment__patient")

    doctors = list(User.objects.filter(role="DOCTOR"))
    if not doctors:
        return "No doctors found — skipped"

    created = 0
    for payment in pending:
        patient_name = "N/A"
        if payment.appointment and payment.appointment.patient:
            patient_name = payment.appointment.patient.full_name

        for doctor in doctors:
            _, new = Notification.objects.get_or_create(
                recipient=doctor,
                notification_type=Notification.PAYMENT_RECEIVED,
                related_type="Payment",
                related_id=payment.pk,
                defaults={
                    "title": "Pago pendiente hace +48h",
                    "message": (
                        f"El pago #{payment.pk} de {patient_name} "
                        "lleva más de 48 horas pendiente."
                    ),
                    "practice": payment.practice,
                },
            )
            if new:
                created += 1

    logger.info("check_pending_payments: created %d notifications", created)
    return f"Created {created} pending-payment notifications"
