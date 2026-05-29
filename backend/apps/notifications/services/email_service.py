"""
Email service for PEDIACORE.

Wraps the Resend API and provides high-level helpers for appointment-related emails.
When RESEND_API_KEY is empty (dev mode), emails are logged as QUEUED without
making any network call.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.conf import settings
from django.utils import timezone

from apps.notifications.models import EmailLog, Notification, NotificationPreference

if TYPE_CHECKING:
    from apps.scheduling.models import Appointment

logger = logging.getLogger(__name__)


def send_email(
    to: str,
    subject: str,
    html_body: str,
    practice=None,
) -> EmailLog:
    """
    Send an email via the Resend API and log the result.

    When RESEND_API_KEY is empty (development mode), the email is recorded
    with status QUEUED and no network call is made.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        html_body: Full HTML body of the email.
        practice: Optional Practice instance for attribution in EmailLog.

    Returns:
        The created EmailLog record.
    """
    api_key = getattr(settings, "RESEND_API_KEY", "")
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@estefipediatra.com")
    body_preview = html_body[:500]

    if not api_key:
        # Dev mode — log without sending
        log = EmailLog.objects.create(
            practice=practice,
            recipient_email=to,
            subject=subject,
            body_preview=body_preview,
            status=EmailLog.QUEUED,
            provider="resend",
        )
        logger.info("Dev mode: email queued without sending to %s (subject: %s)", to, subject)
        return log

    try:
        import resend

        resend.api_key = api_key
        response = resend.Emails.send(
            {
                "from": from_email,
                "to": [to],
                "subject": subject,
                "html": html_body,
            }
        )
        external_id = response.get("id", "") if isinstance(response, dict) else str(response)
        log = EmailLog.objects.create(
            practice=practice,
            recipient_email=to,
            subject=subject,
            body_preview=body_preview,
            status=EmailLog.SENT,
            provider="resend",
            external_id=external_id,
            sent_at=timezone.now(),
        )
        logger.info("Email sent to %s (external_id=%s)", to, external_id)
    except Exception as exc:
        log = EmailLog.objects.create(
            practice=practice,
            recipient_email=to,
            subject=subject,
            body_preview=body_preview,
            status=EmailLog.FAILED,
            provider="resend",
            error_message=str(exc),
        )
        logger.error("Failed to send email to %s: %s", to, exc)

    return log


def _build_appointment_html(title: str, body_lines: list[str]) -> str:
    """Build a minimal HTML email body for appointment notifications."""
    body_html = "".join(f"<p>{line}</p>" for line in body_lines)
    return f"""
    <html>
    <body style="font-family: sans-serif; color: #333;">
        <h2>{title}</h2>
        {body_html}
        <hr>
        <p style="font-size: 12px; color: #888;">
            Consultorio Pediátrico — Dra. Estefanía
        </p>
    </body>
    </html>
    """


def send_appointment_reminder(appointment: Appointment) -> None:
    """
    Send a reminder email to all tutors linked to the appointment's patient.

    Checks each tutor's NotificationPreference before sending.
    Creates a Notification record for each tutor and updates
    appointment.reminder_sent_at after the first successful send.

    Args:
        appointment: The Appointment instance to remind about.
    """
    from apps.patients.models import TutorPatient

    tutors_qs = TutorPatient.objects.filter(patient=appointment.patient).select_related("tutor")

    sent_any = False

    for link in tutors_qs:
        tutor = link.tutor

        # Respect notification preferences
        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not prefs.email_appointment_reminder:
            continue

        subject = f"Recordatorio de consulta — {appointment.scheduled_date}"
        html_body = _build_appointment_html(
            title="Recordatorio de consulta",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Este es un recordatorio de la consulta de {appointment.patient} "
                f"programada para el <strong>{appointment.scheduled_date}</strong> "
                f"a las <strong>{appointment.start_time:%H:%M}</strong>.",
                f"Servicio: {appointment.service.name}",
                f"Lugar: {appointment.location.name if appointment.location else 'Consulta Online'}",
                "Si necesitás cancelar o reprogramar, por favor contactanos con anticipación.",
            ],
        )

        Notification.objects.create(
            practice=appointment.practice,
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_REMINDER,
            title="Recordatorio de consulta",
            message=(
                f"Consulta de {appointment.patient} el {appointment.scheduled_date} "
                f"a las {appointment.start_time:%H:%M}."
            ),
            related_type="Appointment",
            related_id=appointment.pk,
        )

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=appointment.practice,
        )
        sent_any = True

    if sent_any:
        appointment.reminder_sent_at = timezone.now()
        appointment.save(update_fields=["reminder_sent_at", "updated_at"])


def send_appointment_confirmation(appointment: Appointment) -> None:
    """
    Notify all linked tutors that the appointment was confirmed.

    Args:
        appointment: The confirmed Appointment instance.
    """
    from apps.patients.models import TutorPatient

    tutors_qs = TutorPatient.objects.filter(patient=appointment.patient).select_related("tutor")

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not prefs.email_appointment_confirmed:
            continue

        subject = f"Consulta confirmada — {appointment.scheduled_date}"
        html_body = _build_appointment_html(
            title="Consulta confirmada",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"La consulta de {appointment.patient} ha sido <strong>confirmada</strong>.",
                f"Fecha: {appointment.scheduled_date}",
                f"Hora: {appointment.start_time:%H:%M}",
                f"Servicio: {appointment.service.name}",
                f"Lugar: {appointment.location.name if appointment.location else 'Consulta Online'}",
            ],
        )

        Notification.objects.create(
            practice=appointment.practice,
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_CONFIRMED,
            title="Consulta confirmada",
            message=f"La consulta de {appointment.patient} el {appointment.scheduled_date} fue confirmada.",
            related_type="Appointment",
            related_id=appointment.pk,
        )

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=appointment.practice,
        )


def _get_invoice_pdf_attachment(payment) -> dict | None:
    """
    Try to retrieve the invoice PDF bytes for a payment.

    Returns a Resend-compatible attachment dict, or None when no Invoice
    or PDF is available (graceful degradation — email is still sent without attachment).
    """
    try:
        from apps.billing.models import Invoice

        invoice = Invoice.objects.get(payment=payment)
        if invoice.pdf_file and invoice.pdf_file.name:
            try:
                pdf_bytes = invoice.pdf_file.read()
                import base64

                return {
                    "filename": f"comprobante-{invoice.invoice_number}.pdf",
                    "content": base64.b64encode(pdf_bytes).decode("utf-8"),
                }
            except Exception as exc:
                logger.warning("Could not read invoice PDF for Payment #%s: %s", payment.pk, exc)
                return None
    except Exception:
        return None
    return None


def send_payment_receipt(payment) -> None:
    """
    Send a payment receipt email to all tutors linked to the payment's patient.

    Checks each tutor's NotificationPreference.email_payment_received before sending.
    Attaches the invoice PDF if available (graceful degradation when missing).
    Creates a Notification record for each tutor that receives the email.

    Args:
        payment: The completed Payment instance.
    """
    from apps.patients.models import TutorPatient

    patient = payment.patient
    tutors_qs = TutorPatient.objects.filter(patient=patient).select_related("tutor")

    # Resolve appointment details once (shared across all tutors)
    try:
        appointment = payment.appointment
    except Exception:
        appointment = None

    scheduled_date = appointment.scheduled_date if appointment else "—"
    start_time = appointment.start_time.strftime("%H:%M") if appointment else "—"
    service_name = appointment.service.name if appointment and appointment.service else "Consulta médica"
    location_name = appointment.location.name if appointment and appointment.location else "Consulta Online"

    # Format amount: CLP is integer, no decimals
    try:
        amount_display = f"{int(payment.amount):,}".replace(",", ".")
    except (TypeError, ValueError):
        amount_display = str(payment.amount)

    # Try to get the invoice PDF attachment once (same for all tutors)
    pdf_attachment = _get_invoice_pdf_attachment(payment)

    api_key = getattr(settings, "RESEND_API_KEY", "")

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not getattr(prefs, "email_payment_received", True):
            continue

        subject = f"Comprobante de pago — {scheduled_date}"
        html_body = _build_appointment_html(
            title="Pago recibido",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Hemos recibido tu pago de <strong>${amount_display} {payment.currency}</strong>.",
                f"Paciente: {patient}",
                f"Servicio: {service_name}",
                f"Fecha: {scheduled_date}",
                f"Hora: {start_time}",
                f"Lugar: {location_name}",
                "Tu consulta ha sido confirmada. ¡Te esperamos!",
            ],
        )

        Notification.objects.create(
            practice=payment.practice,
            recipient=tutor,
            notification_type=Notification.PAYMENT_RECEIVED,
            title="Pago recibido",
            message=f"Pago de ${amount_display} {payment.currency} recibido para {patient}.",
            related_type="Payment",
            related_id=payment.pk,
        )

        # Send with or without PDF attachment
        if api_key and pdf_attachment:
            _send_email_with_attachment(
                to=tutor.email,
                subject=subject,
                html_body=html_body,
                practice=payment.practice,
                attachment=pdf_attachment,
                api_key=api_key,
            )
        else:
            send_email(
                to=tutor.email,
                subject=subject,
                html_body=html_body,
                practice=payment.practice,
            )


def _send_email_with_attachment(
    to: str,
    subject: str,
    html_body: str,
    attachment: dict,
    api_key: str,
    practice=None,
) -> EmailLog:
    """
    Send an email with a PDF attachment via the Resend API.

    Falls back to send_email() (no attachment) if the API call fails.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        html_body: Full HTML body.
        attachment: Resend-compatible attachment dict with 'filename' and 'content'.
        api_key: Resend API key.
        practice: Optional Practice instance for EmailLog attribution.

    Returns:
        The created EmailLog record.
    """
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@estefipediatra.com")
    body_preview = html_body[:500]

    try:
        import resend

        resend.api_key = api_key
        response = resend.Emails.send(
            {
                "from": from_email,
                "to": [to],
                "subject": subject,
                "html": html_body,
                "attachments": [attachment],
            }
        )
        external_id = response.get("id", "") if isinstance(response, dict) else str(response)
        log = EmailLog.objects.create(
            practice=practice,
            recipient_email=to,
            subject=subject,
            body_preview=body_preview,
            status=EmailLog.SENT,
            provider="resend",
            external_id=external_id,
            sent_at=timezone.now(),
        )
        logger.info("Receipt email with PDF sent to %s (external_id=%s)", to, external_id)
        return log
    except Exception as exc:
        logger.error("Failed to send receipt email with PDF to %s: %s — retrying without attachment", to, exc)
        # Graceful degradation: send without attachment
        return send_email(to=to, subject=subject, html_body=html_body, practice=practice)


def send_appointment_cancellation(appointment: Appointment) -> None:
    """
    Notify all linked tutors that the appointment was cancelled.

    Args:
        appointment: The cancelled Appointment instance.
    """
    from apps.patients.models import TutorPatient

    tutors_qs = TutorPatient.objects.filter(patient=appointment.patient).select_related("tutor")

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not prefs.email_appointment_cancelled:
            continue

        subject = f"Consulta cancelada — {appointment.scheduled_date}"
        html_body = _build_appointment_html(
            title="Consulta cancelada",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Lamentamos informarte que la consulta de {appointment.patient} "
                f"del <strong>{appointment.scheduled_date}</strong> ha sido cancelada.",
                "Por favor contactanos para reprogramar tu cita.",
            ],
        )

        Notification.objects.create(
            practice=appointment.practice,
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_CANCELLED,
            title="Consulta cancelada",
            message=f"La consulta de {appointment.patient} el {appointment.scheduled_date} fue cancelada.",
            related_type="Appointment",
            related_id=appointment.pk,
        )

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=appointment.practice,
        )
