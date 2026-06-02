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
    reply_to = getattr(settings, "DEFAULT_REPLY_TO_EMAIL", "estefiortigosa.peditra@gmail.com")
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
                "reply_to": [reply_to],
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


_EMAIL_BASE_URL = lambda: str(getattr(settings, "FRONTEND_URL", "https://estefipediatra.com"))
_EMAIL_LOGO_URL = lambda: f"{_EMAIL_BASE_URL()}/images/logo.jpg"


def _location_lines(location) -> list[str]:
    """
    Return display lines for a location: name + address when available.

    Returns a single-element list for online appointments, or a two-element
    list (name line + address line) for in-person appointments that have an address.

    Args:
        location: Location instance or None (None → online appointment).
    """
    if not location:
        return ["Lugar: Consulta Online"]
    pin_svg = (
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" '
        'stroke="#4A8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
        'style="display:inline-block;vertical-align:middle;margin-right:6px;">'
        '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>'
        '<circle cx="12" cy="10" r="4" fill="#4A8590"/>'
        "</svg>"
    )
    lines = [f"{pin_svg}{location.name}"]
    if location.address:
        lines.append(
            f'<span style="padding-left:26px; color:#666666; font-size:14px;">'
            f"{location.address}"
            f"</span>"
        )
    return lines


def _build_payment_receipt_html(
    tutor_name: str,
    amount_display: str,
    currency: str,
    patient_name: str,
    service_name: str,
    scheduled_date: str,
    start_time: str,
    location_name: str,
    boleta_warning: bool = True,
    pdf_download_url: str = "",
) -> str:
    """
    Build a branded payment receipt email with structured layout.

    Follows the brand design: hero section with checkmark, amount box,
    detail rows with icons, optional boleta warning, and PDF download button.
    All styles are inline for email client compatibility.
    """
    logo_url = _EMAIL_LOGO_URL()

    # --- Detail rows ---
    detail_rows = [
        ("Paciente", patient_name, '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
        ("Servicio", service_name, '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>'),
        ("Fecha", scheduled_date, '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
        ("Hora", start_time, '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
        ("Lugar", location_name, '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
    ]

    rows_html = ""
    for label, value, icon_path in detail_rows:
        rows_html += f"""
                        <tr>
                            <td style="padding:12px 0; border-bottom:1px dashed #f0f0f0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:14px; color:#666666; vertical-align:middle; width:130px;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;">{icon_path}</svg>
                                            {label}
                                        </td>
                                        <td style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:16px; color:#2C2C2C; font-weight:500; text-align:right; vertical-align:middle;">
                                            {value}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>"""

    # --- Boleta warning ---
    warning_html = ""
    if boleta_warning:
        warning_html = """
                    <tr>
                        <td style="padding:0 0 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FFFBEB; border:1px solid #F59E0B; border-radius:8px;">
                                <tr>
                                    <td style="padding:14px 18px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align:top; padding-right:10px;">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                </td>
                                                <td style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:#2C2C2C; font-size:14px; line-height:1.6;">
                                                    Este es un comprobante de pago generado autom&aacute;ticamente. Si necesit&aacute;s una boleta o factura para reembolso, podr&aacute;s solicitarla el d&iacute;a de tu atenci&oacute;n en la recepci&oacute;n.
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>"""

    # --- PDF download button ---
    download_html = ""
    if pdf_download_url:
        download_html = f"""
                    <tr>
                        <td style="padding:0 0 24px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="background-color:#4A8590; border-radius:8px; text-align:center; padding:14px 24px;">
                                        <a href="{pdf_download_url}" style="color:#FFFFFF; font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:15px; font-weight:600; text-decoration:none; display:inline-block;">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                            Descargar Comprobante PDF
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de pago</title>
    <!--[if !mso]><!-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&amp;family=Plus+Jakarta+Sans:wght@400;600&amp;display=swap');
    </style>
    <!--<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#FBF8F3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FBF8F3;">
        <tr>
            <td align="center" style="padding:32px 16px;">

                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:12px; overflow:hidden;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#4A8590; padding:32px 40px; text-align:center;">
                            <img src="{logo_url}" alt="Dra. Estefi Pediatra" width="72" height="72" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,255,255,0.2); display:block; margin:0 auto;">
                            <h1 style="font-family:'Fraunces',Georgia,'Times New Roman',serif; color:#FFFFFF; margin:14px 0 0; font-size:22px; font-weight:600;">Dra. Estefi</h1>
                            <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:rgba(255,255,255,0.75); margin:4px 0 0; font-size:12px; letter-spacing:0.5px;">Pediatra &middot; Sur de Chile</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">

                                <!-- Hero -->
                                <tr>
                                    <td style="text-align:center; padding:0 0 24px;">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4A8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 12px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                        <h2 style="font-family:'Fraunces',Georgia,'Times New Roman',serif; color:#4A8590; font-size:24px; margin:0 0 8px; font-weight:600;">Pago recibido</h2>
                                        <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:#2C2C2C; font-size:16px; line-height:1.6; margin:0;">Gracias por confiar en nosotros.</p>
                                    </td>
                                </tr>

                                <!-- Greeting -->
                                <tr>
                                    <td style="padding:0 0 24px;">
                                        <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:#2C2C2C; font-size:16px; line-height:1.6; margin:0 0 8px;">Hola <strong>{tutor_name}</strong>,</p>
                                        <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:#2C2C2C; font-size:16px; line-height:1.6; margin:0;">Hemos recibido el pago de tu pr&oacute;xima cita. A continuaci&oacute;n encontrar&aacute;s los detalles de tu comprobante.</p>
                                    </td>
                                </tr>

                                <!-- Amount box -->
                                <tr>
                                    <td style="padding:0 0 24px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb; border-radius:12px;">
                                            <tr>
                                                <td style="padding:24px; text-align:center;">
                                                    <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#6b7280; font-weight:700; margin:0 0 8px;">Total Pagado</p>
                                                    <p style="font-family:'Fraunces',Georgia,'Times New Roman',serif; font-size:32px; color:#2C2C2C; font-weight:700; margin:0;">${amount_display} {currency}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Details header -->
                                <tr>
                                    <td style="padding:0 0 4px; border-bottom:1px solid #f0f0f0;">
                                        <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#6b7280; font-weight:700; margin:0;">Detalles del Servicio</p>
                                    </td>
                                </tr>

                                <!-- Detail rows -->
                                {rows_html}

                                <!-- Spacer -->
                                <tr><td style="padding:12px 0;"></td></tr>

                                <!-- Warning -->
                                {warning_html}

                                <!-- Download button -->
                                {download_html}

                                <!-- Disclaimer -->
                                <tr>
                                    <td style="text-align:center; padding:0 0 12px;">
                                        <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:11px; color:#A0A0A0; margin:0;">Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#2C2C2C; padding:28px 40px; text-align:center;">
                            <img src="{logo_url}" alt="" width="44" height="44" style="width:44px; height:44px; border-radius:50%; border:2px solid rgba(255,255,255,0.15); display:block; margin:0 auto 12px;">
                            <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:rgba(255,255,255,0.6); font-size:13px; margin:0 0 4px; font-weight:600;">Dra. Estefi</p>
                            <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:rgba(255,255,255,0.35); font-size:12px; margin:0 0 20px;">Pediatr&iacute;a con tiempo, calidez y atenci&oacute;n personalizada</p>
                            <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:12px; color:rgba(255,255,255,0.5); line-height:1.8; margin:0 0 16px;">
                                Puc&oacute;n &amp; Villarrica &middot; La Araucan&iacute;a, Chile<br>
                                <a href="tel:+56958455537" style="color:#7BB5BD; text-decoration:none;">+56 9 5845 5537</a>
                                &nbsp;&middot;&nbsp;
                                <a href="mailto:estefiortigosa.peditra@gmail.com" style="color:#7BB5BD; text-decoration:none;">estefiortigosa.peditra@gmail.com</a>
                            </p>
                            <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:12px; margin:0;">
                                <a href="https://www.instagram.com/estefiortigosa.pediatra/" style="color:#7BB5BD; text-decoration:none; margin:0 8px;">Instagram</a>
                                <a href="https://estefipediatra.com" style="color:#7BB5BD; text-decoration:none; margin:0 8px;">Web</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Bottom bar -->
                    <tr>
                        <td style="background-color:#1f1f1f; padding:14px 40px; text-align:center;">
                            <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; color:rgba(255,255,255,0.25); font-size:11px; margin:0;">
                                &copy; 2026 Dra. Estefi Pediatra &middot; estefipediatra.com
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


def _build_appointment_html(
    title: str,
    body_lines: list[str],
    token_urls: dict | None = None,
    extra_html: str = "",
) -> str:
    """
    Build a professional brand-aligned HTML email body for appointment notifications.

    Args:
        title: The heading displayed at the top of the email.
        body_lines: List of text lines to render as <p> elements.
        token_urls: Optional dict with keys 'confirm', 'cancel', 'reschedule'.
            When provided, action buttons are rendered below the body.
        extra_html: Optional raw HTML block inserted after body_lines and before
            action buttons. Use for banners or callout boxes that need full HTML
            control (e.g. warning boxes with background color). Must use inline CSS.
    """
    body_html = "".join(
        '<p style="font-family:\'Plus Jakarta Sans\',Arial,sans-serif; '
        'color:#2C2C2C; font-size:16px; line-height:1.6; margin:0 0 12px;">'
        f"{line}</p>"
        for line in body_lines
    )

    action_buttons_html = ""
    if token_urls:
        confirm_url = token_urls.get("confirm", "")
        cancel_url = token_urls.get("cancel", "")
        reschedule_url = token_urls.get("reschedule", "")

        buttons = []
        if confirm_url:
            buttons.append(f"""
                <td style="padding:4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="background-color:#4A8590; border-radius:8px; text-align:center; padding:12px 24px;">
                                <a href="{confirm_url}" style="color:#FFFFFF; font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:13px; font-weight:600; text-decoration:none; display:inline-block; white-space:nowrap;">Confirmar asistencia</a>
                            </td>
                        </tr>
                    </table>
                </td>""")
        if cancel_url:
            buttons.append(f"""
                <td style="padding:4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="background-color:#F7F0E5; border-radius:8px; text-align:center; padding:12px 24px;">
                                <a href="{cancel_url}" style="color:#2C2C2C; font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:13px; font-weight:600; text-decoration:none; display:inline-block; white-space:nowrap;">Cancelar cita</a>
                            </td>
                        </tr>
                    </table>
                </td>""")
        if reschedule_url:
            buttons.append(f"""
                <td style="padding:4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="background-color:#FFFFFF; border:2px solid #4A8590; border-radius:8px; text-align:center; padding:10px 22px;">
                                <a href="{reschedule_url}" style="color:#4A8590; font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:14px; font-weight:600; text-decoration:none; display:inline-block; white-space:nowrap; letter-spacing:0.3px;">Reprogramar</a>
                            </td>
                        </tr>
                    </table>
                </td>""")

        if buttons:
            action_buttons_html = f"""
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
                <tr>
                    {''.join(buttons)}
                </tr>
            </table>"""

    logo_url = _EMAIL_LOGO_URL()

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <!--[if !mso]><!-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&amp;family=Plus+Jakarta+Sans:wght@400;600&amp;display=swap');
    </style>
    <!--<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#FBF8F3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FBF8F3;">
        <tr>
            <td align="center" style="padding:32px 16px;">

                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:12px; overflow:hidden;">

                    <!-- Header: brand bar -->
                    <tr>
                        <td style="background-color:#4A8590; padding:32px 40px; text-align:center;">
                            <img src="{logo_url}" alt="Dra. Estefi Pediatra" width="72" height="72" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,255,255,0.2); display:block; margin:0 auto;">
                            <h1 style="font-family:'Fraunces',Georgia,'Times New Roman',serif; color:#FFFFFF; margin:14px 0 0; font-size:22px; font-weight:600;">Dra. Estefi</h1>
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.75); margin:4px 0 0; font-size:12px; letter-spacing:0.5px;">Pediatra &middot; Sur de Chile</p>
                        </td>
                    </tr>

                    <!-- Body content -->
                    <tr>
                        <td style="padding:36px 40px;">
                            <h2 style="font-family:'Fraunces',Georgia,'Times New Roman',serif; color:#4A8590; font-size:20px; margin:0 0 20px; font-weight:600;">{title}</h2>
                            {body_html}
                            {extra_html}
                            {action_buttons_html}
                        </td>
                    </tr>

                    <!-- Footer: contact + social -->
                    <tr>
                        <td style="background-color:#2C2C2C; padding:28px 40px; text-align:center;">
                            <img src="{logo_url}" alt="" width="44" height="44" style="width:44px; height:44px; border-radius:50%; border:2px solid rgba(255,255,255,0.15); display:block; margin:0 auto 12px;">
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.6); font-size:13px; margin:0 0 4px; font-weight:600;">Dra. Estefi</p>
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.35); font-size:12px; margin:0 0 20px;">Pediatr&iacute;a con tiempo, calidez y atenci&oacute;n personalizada</p>

                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:12px; color:rgba(255,255,255,0.5); line-height:1.8; margin:0 0 16px;">
                                Puc&oacute;n &amp; Villarrica &middot; La Araucan&iacute;a, Chile<br>
                                <a href="tel:+56958455537" style="color:#7BB5BD; text-decoration:none;">+56 9 5845 5537</a>
                                &nbsp;&middot;&nbsp;
                                <a href="mailto:estefiortigosa.peditra@gmail.com" style="color:#7BB5BD; text-decoration:none;">estefiortigosa.peditra@gmail.com</a>
                            </p>

                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:12px; margin:0;">
                                <a href="https://www.instagram.com/estefiortigosa.pediatra/" style="color:#7BB5BD; text-decoration:none; margin:0 8px;">Instagram</a>
                                <a href="https://estefipediatra.com" style="color:#7BB5BD; text-decoration:none; margin:0 8px;">Web</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Bottom bar -->
                    <tr>
                        <td style="background-color:#1f1f1f; padding:14px 40px; text-align:center;">
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.25); font-size:11px; margin:0;">
                                &copy; 2026 Dra. Estefi Pediatra &middot; estefipediatra.com
                            </p>
                        </td>
                    </tr>
                </table>

                <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#A0A0A0; font-size:11px; margin:16px 0 0; text-align:center;">
                    Este es un correo autom&aacute;tico del sistema de turnos de la Dra. Estefan&iacute;a.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>"""


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
                *_location_lines(appointment.location),
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


def send_appointment_confirmation(
    appointment: Appointment,
    token_urls: dict | None = None,
) -> None:
    """
    Notify all linked tutors that the appointment was confirmed.

    Args:
        appointment: The confirmed Appointment instance.
        token_urls: Optional dict with keys 'confirm', 'cancel', 'reschedule'.
            When provided, the email body includes clickable action links so the
            tutor can confirm attendance, cancel, or reschedule from the email.
            When None (default), the email is sent without links (backward compat).
    """
    from apps.patients.models import TutorPatient

    tutors_qs = TutorPatient.objects.filter(patient=appointment.patient).select_related("tutor")

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not prefs.email_appointment_confirmed:
            continue

        subject = f"Consulta confirmada — {appointment.scheduled_date}"
        body_lines = [
            f"Hola {tutor.first_name},",
            f"La consulta de {appointment.patient} ha sido <strong>confirmada</strong>.",
            f"Fecha: {appointment.scheduled_date}",
            f"Hora: {appointment.start_time:%H:%M}",
            f"Servicio: {appointment.service.name}",
            *_location_lines(appointment.location),
        ]
        if appointment.is_online and appointment.meeting_link:
            body_lines.append(
                f'Enlace de videollamada: <a href="{appointment.meeting_link}">'
                f"{appointment.meeting_link}</a>"
            )
        html_body = _build_appointment_html(
            title="Consulta confirmada",
            body_lines=body_lines,
            token_urls=token_urls,
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

        # Build PDF download URL if invoice exists
        pdf_download_url = ""
        try:
            from apps.billing.models import Invoice

            invoice = Invoice.objects.filter(payment=payment).first()
            if invoice:
                site_url = getattr(settings, "SITE_URL", "").rstrip("/")
                pdf_download_url = f"{site_url}/api/v1/billing/invoices/{invoice.pk}/download/"
        except Exception:
            pass

        # Resolve location display name
        location_display = "Consulta Online"
        if appointment and appointment.location:
            location_display = appointment.location.name
            if appointment.location.address:
                location_display += f" — {appointment.location.address}"

        subject = f"Comprobante de pago — {scheduled_date}"
        html_body = _build_payment_receipt_html(
            tutor_name=tutor.first_name,
            amount_display=amount_display,
            currency=payment.currency,
            patient_name=str(patient),
            service_name=service_name,
            scheduled_date=str(scheduled_date),
            start_time=start_time,
            location_name=location_display,
            pdf_download_url=pdf_download_url,
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
    reply_to = getattr(settings, "DEFAULT_REPLY_TO_EMAIL", "estefiortigosa.peditra@gmail.com")
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
                "reply_to": [reply_to],
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


def send_appointment_reschedule(
    appointment: Appointment,
    token_urls: dict | None = None,
) -> None:
    """
    Notify all linked tutors that the appointment was rescheduled.

    Sends the new appointment date/time so tutors know when their new
    appointment is scheduled. Includes token action links when available.
    Respects NotificationPreference.email_appointment_confirmed.

    Args:
        appointment: The NEW Appointment instance (CONFIRMED, rescheduled_from set).
        token_urls: Optional dict with keys 'confirm', 'cancel', 'reschedule'.
            When None, token URLs are auto-resolved from the database.
    """
    from apps.patients.models import TutorPatient

    tutors_qs = TutorPatient.objects.filter(patient=appointment.patient).select_related("tutor")

    resolved_token_urls = token_urls if token_urls is not None else _build_token_urls_for_appointment(appointment)

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not prefs.email_appointment_confirmed:
            continue

        subject = f"Tu cita ha sido reagendada — {appointment.scheduled_date}"
        html_body = _build_appointment_html(
            title="Tu cita ha sido reagendada",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Tu consulta de {appointment.patient} ha sido <strong>reagendada</strong>.",
                f"Nueva fecha: {appointment.scheduled_date}",
                f"Nueva hora: {appointment.start_time:%H:%M}",
                f"Servicio: {appointment.service.name}",
                *_location_lines(appointment.location),
                "Si necesitás hacer cambios adicionales, por favor contactanos.",
            ],
            token_urls=resolved_token_urls,
        )

        Notification.objects.create(
            practice=appointment.practice,
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_CONFIRMED,
            title="Tu cita ha sido reagendada",
            message=(
                f"La consulta de {appointment.patient} fue reagendada al "
                f"{appointment.scheduled_date} a las {appointment.start_time:%H:%M}."
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


def _build_token_urls_for_appointment(appointment) -> dict | None:
    """
    Retrieve token URLs for an appointment if tokens exist.

    Returns a dict with 'confirm', 'cancel', 'reschedule' keys, or None if
    no tokens are found (e.g., first-time send before tokens are created).
    """
    try:
        from apps.scheduling.models import AppointmentToken

        site_url = getattr(settings, "SITE_URL", "").rstrip("/")
        tokens = AppointmentToken.objects.filter(
            appointment=appointment,
            used_at__isnull=True,
        ).values("action", "token")

        token_map = {t["action"]: t["token"] for t in tokens}
        if not token_map:
            return None

        return {
            "confirm": f"{site_url}/a/{token_map.get('CONFIRM', '')}/",
            "cancel": f"{site_url}/a/{token_map.get('CANCEL', '')}/",
            "reschedule": f"{site_url}/a/{token_map.get('RESCHEDULE', '')}/",
        }
    except Exception:
        return None


def send_24h_reminder(appointment) -> None:
    """
    Send a 24-hour reminder email to all tutors linked to the appointment's patient.

    Respects NotificationPreference.email_appointment_reminder.
    Sets appointment.reminder_24h_sent = True and saves regardless of opt-out status
    (the flag prevents the job from retrying even when tutors opted out).
    Creates a Notification record for each tutor that receives the email.

    Args:
        appointment: The Appointment instance to remind about.
    """
    from apps.patients.models import TutorPatient

    tutors_qs = TutorPatient.objects.filter(patient=appointment.patient).select_related("tutor")
    token_urls = _build_token_urls_for_appointment(appointment)

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not prefs.email_appointment_reminder:
            # Respect opt-out: no email, but flag will be set after the loop
            continue

        subject = "Recordatorio: tu cita es mañana"
        reminder_lines = [
            f"Hola {tutor.first_name},",
            f"Este es un recordatorio de la consulta de {appointment.patient} "
            f"programada para <strong>mañana {appointment.scheduled_date}</strong> "
            f"a las <strong>{appointment.start_time:%H:%M}</strong>.",
            f"Servicio: {appointment.service.name}",
            *_location_lines(appointment.location),
        ]
        if appointment.is_online and appointment.meeting_link:
            reminder_lines.append(
                f'Enlace de videollamada: <a href="{appointment.meeting_link}">'
                f"{appointment.meeting_link}</a>"
            )
        html_body = _build_appointment_html(
            title="Recordatorio: tu cita es mañana",
            body_lines=reminder_lines,
            token_urls=token_urls,
        )

        Notification.objects.create(
            practice=appointment.practice,
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_REMINDER,
            title="Recordatorio: tu cita es mañana",
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

    appointment.reminder_24h_sent = True
    appointment.save(update_fields=["reminder_24h_sent", "updated_at"])


def send_2h_reminder(appointment) -> None:
    """
    Send a 2-hour reminder email for online appointments only.

    Only processes appointments with is_online=True. Silently skips in-person.
    Respects NotificationPreference.email_appointment_reminder.
    Sets appointment.reminder_2h_sent = True and saves.
    Creates a Notification record for each tutor that receives the email.

    Args:
        appointment: The Appointment instance to remind about.
    """
    if not appointment.is_online:
        return

    from apps.patients.models import TutorPatient

    tutors_qs = TutorPatient.objects.filter(patient=appointment.patient).select_related("tutor")
    token_urls = _build_token_urls_for_appointment(appointment)

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not prefs.email_appointment_reminder:
            continue

        meeting_link = appointment.meeting_link or ""
        subject = "Tu consulta online empieza en 2 horas"
        html_body = _build_appointment_html(
            title="Tu consulta online empieza en 2 horas",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"La consulta online de {appointment.patient} comienza hoy "
                f"a las <strong>{appointment.start_time:%H:%M}</strong>.",
                (
                    f'Enlace de reunión: <a href="{meeting_link}">{meeting_link}</a>'
                    if meeting_link
                    else "Enlace de reunión: pendiente."
                ),
            ],
            token_urls=token_urls,
        )

        Notification.objects.create(
            practice=appointment.practice,
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_REMINDER,
            title="Tu consulta online empieza en 2 horas",
            message=(
                f"Consulta online de {appointment.patient} hoy "
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

    appointment.reminder_2h_sent = True
    appointment.save(update_fields=["reminder_2h_sent", "updated_at"])
