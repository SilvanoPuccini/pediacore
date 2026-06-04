"""
Email service for PEDIACORE.

Wraps the Resend API and provides high-level helpers for appointment-related emails.
When RESEND_API_KEY is empty (dev mode), emails are logged as QUEUED without
making any network call.
"""

from __future__ import annotations

import datetime as _dt
import logging
from typing import TYPE_CHECKING

from django.conf import settings
from django.utils import timezone

from apps.notifications.models import EmailLog, Notification, NotificationPreference

if TYPE_CHECKING:
    from apps.scheduling.models import Appointment

logger = logging.getLogger(__name__)

# ─── Date / time formatting helpers ──────────────────────────────────────────

_MONTHS_ES = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _fmt_date(d: _dt.date | str | None) -> str:
    """Format a date as '10 de junio de 2026'."""
    if d is None:
        return "—"
    if isinstance(d, str):
        parts = d.split("-")
        if len(parts) == 3:
            d = _dt.date(int(parts[0]), int(parts[1]), int(parts[2]))
        else:
            return d
    return f"{d.day} de {_MONTHS_ES[d.month]} de {d.year}"


def _fmt_date_short(d: _dt.date | str | None) -> str:
    """Format a date as '10/06/2026'."""
    if d is None:
        return "—"
    if isinstance(d, str):
        parts = d.split("-")
        if len(parts) == 3:
            d = _dt.date(int(parts[0]), int(parts[1]), int(parts[2]))
        else:
            return d
    return f"{d.day:02d}/{d.month:02d}/{d.year}"


def _fmt_time(t: _dt.time | str | None) -> str:
    """Format a time as '10:30 hrs' or '16:30 hrs'."""
    if t is None:
        return "—"
    if isinstance(t, str):
        return f"{t[:5]} hrs"
    return f"{t:%H:%M} hrs"


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
_EMAIL_LOGO_URL = lambda: f"{_EMAIL_BASE_URL()}/images/logo.png"


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
) -> str:
    """
    Build a branded payment receipt email with structured layout.

    Follows the brand design: hero section with checkmark, amount box,
    detail rows with icons, and optional boleta warning.
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
                            <img src="{logo_url}" alt="Dra. Estefi Pediatra" width="88" height="88" style="width:88px; height:88px; border-radius:50%; object-fit:cover; background-color:#ffffff; border:3px solid rgba(255,255,255,0.2); display:block; margin:0 auto;">
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
                            <img src="{logo_url}" alt="" width="56" height="56" style="width:56px; height:56px; border-radius:50%; object-fit:cover; background-color:#ffffff; border:2px solid rgba(255,255,255,0.2); display:block; margin:0 auto 12px;">
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.9); font-size:13px; margin:0 0 4px; font-weight:600;">Dra. Estefi</p>
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.6); font-size:12px; margin:0 0 20px;">Pediatr&iacute;a con tiempo, calidez y atenci&oacute;n personalizada</p>
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:12px; color:rgba(255,255,255,0.7); line-height:1.8; margin:0 0 16px;">
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
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.5); font-size:11px; margin:0;">
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

    Renders a structured layout with a contextual hero icon, a greeting paragraph,
    structured detail rows (lines containing known labels like "Fecha:", "Hora:",
    "Servicio:", "Lugar:") and plain paragraphs for narrative text.
    Lines starting with an SVG or <span> tag (from _location_lines) are rendered
    as location detail rows automatically.

    Args:
        title: The heading displayed at the top of the email.
        body_lines: List of text lines. First line is treated as the greeting.
            Lines with known "Label:" prefixes become structured rows with icons.
            SVG/span-prefixed lines become location rows. All others are paragraphs.
        token_urls: Optional dict with keys 'confirm', 'cancel', 'reschedule'.
            When provided, action buttons are rendered below the body.
        extra_html: Optional raw HTML block inserted after body_lines and before
            action buttons. Use for banners or callout boxes that need full HTML
            control (e.g. warning boxes with background color). Must use inline CSS.
    """
    # ------------------------------------------------------------------ #
    # Hero icon — contextual SVG based on title keywords                  #
    # ------------------------------------------------------------------ #
    title_lower = title.lower()
    if "confirmada" in title_lower or "confirmado" in title_lower:
        hero_svg_path = (
            '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>'
            '<polyline points="22 4 12 14.01 9 11.01"/>'
        )
    elif "cancelada" in title_lower or "cancelado" in title_lower:
        hero_svg_path = (
            '<circle cx="12" cy="12" r="10"/>'
            '<line x1="15" y1="9" x2="9" y2="15"/>'
            '<line x1="9" y1="9" x2="15" y2="15"/>'
        )
    elif "reagendada" in title_lower or "reprogramar" in title_lower or "reagendado" in title_lower:
        hero_svg_path = (
            '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>'
            '<line x1="16" y1="2" x2="16" y2="6"/>'
            '<line x1="8" y1="2" x2="8" y2="6"/>'
            '<line x1="3" y1="10" x2="21" y2="10"/>'
            '<polyline points="14 14 16 16 20 12"/>'
        )
    elif (
        "recordatorio" in title_lower
        or "mañana" in title_lower
        or "2 horas" in title_lower
        or "horas" in title_lower
    ):
        hero_svg_path = (
            '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>'
            '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
        )
    elif "bienvenida" in title_lower or "bienvenido" in title_lower:
        hero_svg_path = (
            '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06'
            'a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06'
            'a5.5 5.5 0 0 0 0-7.78z"/>'
        )
    else:
        hero_svg_path = (
            '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>'
            '<line x1="16" y1="2" x2="16" y2="6"/>'
            '<line x1="8" y1="2" x2="8" y2="6"/>'
            '<line x1="3" y1="10" x2="21" y2="10"/>'
        )

    hero_svg = (
        f'<svg width="48" height="48" viewBox="0 0 24 24" fill="none" '
        f'stroke="#4A8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
        f'style="display:block;margin:0 auto 12px;">{hero_svg_path}</svg>'
    )

    # ------------------------------------------------------------------ #
    # Icon SVG paths for structured detail rows (16×16)                   #
    # ------------------------------------------------------------------ #
    _ICON_CALENDAR = (
        '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>'
        '<line x1="16" y1="2" x2="16" y2="6"/>'
        '<line x1="8" y1="2" x2="8" y2="6"/>'
        '<line x1="3" y1="10" x2="21" y2="10"/>'
    )
    _ICON_CLOCK = (
        '<circle cx="12" cy="12" r="10"/>'
        '<polyline points="12 6 12 12 16 14"/>'
    )
    _ICON_SERVICE = (
        '<path d="M18 20V10"/>'
        '<path d="M12 20V4"/>'
        '<path d="M6 20v-6"/>'
    )
    _ICON_LOCATION = (
        '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>'
        '<circle cx="12" cy="10" r="3"/>'
    )
    _ICON_LINK = (
        '<path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5'
        ' 5 5 0 0 1 5-5h3"/>'
        '<line x1="8" y1="12" x2="16" y2="12"/>'
    )

    # Maps label prefix (lowercase, stripped) → icon path
    _LABEL_ICON_MAP = {
        "fecha": _ICON_CALENDAR,
        "nueva fecha": _ICON_CALENDAR,
        "hora": _ICON_CLOCK,
        "nueva hora": _ICON_CLOCK,
        "servicio": _ICON_SERVICE,
        "lugar": _ICON_LOCATION,
        "enlace": _ICON_LINK,
        "enlace de videollamada": _ICON_LINK,
        "enlace de reunión": _ICON_LINK,
    }

    def _make_detail_row(label: str, value: str, icon_path: str) -> str:
        icon_svg = (
            f'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" '
            f'stroke="#4A8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
            f'style="display:inline-block;vertical-align:middle;margin-right:6px;">'
            f'{icon_path}</svg>'
        )
        return f"""
                        <tr>
                            <td style="padding:12px 0; border-bottom:1px dashed #f0f0f0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:14px; color:#666666; vertical-align:middle; width:150px;">
                                            {icon_svg}{label}
                                        </td>
                                        <td style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:16px; color:#2C2C2C; font-weight:500; text-align:right; vertical-align:middle;">
                                            {value}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>"""

    def _make_location_row(content: str) -> str:
        """Render a raw SVG/span location line as a structured row."""
        icon_svg = (
            f'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" '
            f'stroke="#4A8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
            f'style="display:inline-block;vertical-align:middle;margin-right:6px;">'
            f'{_ICON_LOCATION}</svg>'
        )
        return f"""
                        <tr>
                            <td style="padding:12px 0; border-bottom:1px dashed #f0f0f0;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:14px; color:#666666; vertical-align:middle; width:150px;">
                                            {icon_svg}Lugar
                                        </td>
                                        <td style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:16px; color:#2C2C2C; font-weight:500; text-align:right; vertical-align:middle;">
                                            {content}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>"""

    def _make_paragraph(text: str) -> str:
        return (
            f'<p style="font-family:\'Plus Jakarta Sans\',Arial,sans-serif; '
            f'color:#2C2C2C; font-size:16px; line-height:1.6; margin:0 0 12px;">'
            f'{text}</p>'
        )

    # ------------------------------------------------------------------ #
    # Parse body_lines → greeting + detail rows + paragraphs              #
    # ------------------------------------------------------------------ #
    greeting_html = ""
    detail_rows_html = ""
    paragraph_html = ""
    has_detail_rows = False

    for i, line in enumerate(body_lines):
        if i == 0:
            # First line is always the greeting
            greeting_html = _make_paragraph(line)
            continue

        # Lines starting with SVG or <span> come from _location_lines()
        stripped = line.strip()
        if stripped.startswith("<svg") or stripped.startswith("<span"):
            detail_rows_html += _make_location_row(stripped)
            has_detail_rows = True
            continue

        # Try to match "Label: value" pattern against known labels
        if ":" in line:
            colon_pos = line.index(":")
            raw_label = line[:colon_pos].strip()
            value = line[colon_pos + 1:].strip()
            label_lower = raw_label.lower()
            if label_lower in _LABEL_ICON_MAP:
                detail_rows_html += _make_detail_row(raw_label, value, _LABEL_ICON_MAP[label_lower])
                has_detail_rows = True
                continue

        # Fallback: render as paragraph
        paragraph_html += _make_paragraph(line)

    # Wrap detail rows in table structure when present
    detail_section_html = ""
    if has_detail_rows:
        detail_section_html = f"""
                            <!-- Details header -->
                            <tr>
                                <td style="padding:0 0 4px; border-bottom:1px solid #f0f0f0;">
                                    <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#6b7280; font-weight:700; margin:0;">Detalles de la cita</p>
                                </td>
                            </tr>
                            {detail_rows_html}
                            <!-- Spacer after rows -->
                            <tr><td style="padding:8px 0;"></td></tr>"""

    # ------------------------------------------------------------------ #
    # Action buttons                                                       #
    # ------------------------------------------------------------------ #
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
                            <img src="{logo_url}" alt="Dra. Estefi Pediatra" width="88" height="88" style="width:88px; height:88px; border-radius:50%; object-fit:cover; background-color:#ffffff; border:3px solid rgba(255,255,255,0.2); display:block; margin:0 auto;">
                            <h1 style="font-family:'Fraunces',Georgia,'Times New Roman',serif; color:#FFFFFF; margin:14px 0 0; font-size:22px; font-weight:600;">Dra. Estefi</h1>
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.75); margin:4px 0 0; font-size:12px; letter-spacing:0.5px;">Pediatra &middot; Sur de Chile</p>
                        </td>
                    </tr>

                    <!-- Body content -->
                    <tr>
                        <td style="padding:36px 40px 0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">

                                <!-- Hero -->
                                <tr>
                                    <td style="text-align:center; padding:0 0 24px;">
                                        {hero_svg}
                                        <h2 style="font-family:'Fraunces',Georgia,'Times New Roman',serif; color:#4A8590; font-size:24px; margin:0; font-weight:600;">{title}</h2>
                                    </td>
                                </tr>

                                <!-- Greeting -->
                                <tr>
                                    <td style="padding:0 0 20px;">
                                        {greeting_html}
                                    </td>
                                </tr>

                                {detail_section_html}

                                <!-- Narrative paragraphs (non-structured lines) -->
                                {f'<tr><td style="padding:0 0 8px;">{paragraph_html}</td></tr>' if paragraph_html else ''}

                                <!-- Extra HTML (caller-supplied banners, callouts) -->
                                {f'<tr><td style="padding:0 0 8px;">{extra_html}</td></tr>' if extra_html else ''}

                                <!-- Action buttons -->
                                {f'<tr><td style="padding:0 0 24px;">{action_buttons_html}</td></tr>' if action_buttons_html else ''}

                                <!-- Disclaimer -->
                                <tr>
                                    <td style="text-align:center; padding:0 0 12px;">
                                        <p style="font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:11px; color:#A0A0A0; margin:0;">Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.</p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>

                    <!-- Footer: contact + social -->
                    <tr>
                        <td style="background-color:#2C2C2C; padding:28px 40px; text-align:center;">
                            <img src="{logo_url}" alt="" width="56" height="56" style="width:56px; height:56px; border-radius:50%; object-fit:cover; background-color:#ffffff; border:2px solid rgba(255,255,255,0.2); display:block; margin:0 auto 12px;">
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.9); font-size:13px; margin:0 0 4px; font-weight:600;">Dra. Estefi</p>
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.6); font-size:12px; margin:0 0 20px;">Pediatr&iacute;a con tiempo, calidez y atenci&oacute;n personalizada</p>

                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:12px; color:rgba(255,255,255,0.7); line-height:1.8; margin:0 0 16px;">
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
                            <p style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:rgba(255,255,255,0.5); font-size:11px; margin:0;">
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

        subject = f"Recordatorio de consulta — {_fmt_date_short(appointment.scheduled_date)}"
        html_body = _build_appointment_html(
            title="Recordatorio de consulta",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Este es un recordatorio de la consulta de {appointment.patient} "
                f"programada para el <strong>{_fmt_date(appointment.scheduled_date)}</strong> "
                f"a las <strong>{_fmt_time(appointment.start_time)}</strong>.",
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
                f"Consulta de {appointment.patient} el {_fmt_date_short(appointment.scheduled_date)} "
                f"a las {_fmt_time(appointment.start_time)}."
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

        subject = f"Consulta confirmada — {_fmt_date_short(appointment.scheduled_date)}"
        body_lines = [
            f"Hola {tutor.first_name},",
            f"La consulta de {appointment.patient} ha sido <strong>confirmada</strong>.",
            f"Fecha: {_fmt_date(appointment.scheduled_date)}",
            f"Hora: {_fmt_time(appointment.start_time)}",
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
            message=f"La consulta de {appointment.patient} el {_fmt_date_short(appointment.scheduled_date)} fue confirmada.",
            related_type="Appointment",
            related_id=appointment.pk,
        )

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=appointment.practice,
        )


def send_payment_receipt(payment) -> None:
    """
    Send a payment receipt email to all tutors linked to the payment's patient.

    Checks each tutor's NotificationPreference.email_payment_received before sending.
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

    scheduled_date = _fmt_date(appointment.scheduled_date) if appointment else "—"
    start_time = _fmt_time(appointment.start_time) if appointment else "—"
    service_name = appointment.service.name if appointment and appointment.service else "Consulta médica"

    # Format amount: CLP is integer, no decimals
    try:
        amount_display = f"{int(payment.amount):,}".replace(",", ".")
    except (TypeError, ValueError):
        amount_display = str(payment.amount)

    for link in tutors_qs:
        tutor = link.tutor

        prefs = NotificationPreference.objects.filter(user=tutor).first()
        if prefs and not getattr(prefs, "email_payment_received", True):
            continue

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

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=payment.practice,
        )


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

        subject = f"Tu cita ha sido reagendada — {_fmt_date_short(appointment.scheduled_date)}"
        html_body = _build_appointment_html(
            title="Tu cita ha sido reagendada",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Tu consulta de {appointment.patient} ha sido <strong>reagendada</strong>.",
                f"Nueva fecha: {_fmt_date(appointment.scheduled_date)}",
                f"Nueva hora: {_fmt_time(appointment.start_time)}",
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
                f"{_fmt_date_short(appointment.scheduled_date)} a las {_fmt_time(appointment.start_time)}."
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

        subject = f"Consulta cancelada — {_fmt_date_short(appointment.scheduled_date)}"
        html_body = _build_appointment_html(
            title="Consulta cancelada",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Lamentamos informarte que la consulta de {appointment.patient} "
                f"del <strong>{_fmt_date(appointment.scheduled_date)}</strong> ha sido cancelada.",
                "Por favor contactanos para reprogramar tu cita.",
            ],
        )

        Notification.objects.create(
            practice=appointment.practice,
            recipient=tutor,
            notification_type=Notification.APPOINTMENT_CANCELLED,
            title="Consulta cancelada",
            message=f"La consulta de {appointment.patient} el {_fmt_date_short(appointment.scheduled_date)} fue cancelada.",
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
            f"programada para <strong>mañana {_fmt_date(appointment.scheduled_date)}</strong> "
            f"a las <strong>{_fmt_time(appointment.start_time)}</strong>.",
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
                f"Consulta de {appointment.patient} el {_fmt_date_short(appointment.scheduled_date)} "
                f"a las {_fmt_time(appointment.start_time)}."
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
                f"a las <strong>{_fmt_time(appointment.start_time)}</strong>.",
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
                f"a las {_fmt_time(appointment.start_time)}."
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


# ─── Transfer payment email helpers ──────────────────────────────────────────


def _fmt_clp(amount) -> str:
    """Format a CLP amount as '35.000' (thousands separator, no decimals)."""
    try:
        return f"{int(amount):,}".replace(",", ".")
    except (TypeError, ValueError):
        return str(amount)


def send_transfer_receipt_uploaded(payment) -> None:
    """
    Notify the doctor that a tutor uploaded a transfer receipt.

    Sent to: practice owner (doctor).
    Subject: "<patient_name> subió un comprobante de $<amount> para el turno del <date>"

    Args:
        payment: The Payment instance with receipt_file set.
    """
    try:
        appointment = payment.appointment
    except Exception:
        appointment = None

    patient_name = str(payment.patient) if payment.patient else "Un tutor"
    amount_display = _fmt_clp(payment.amount)
    scheduled_date = _fmt_date(appointment.scheduled_date) if appointment else "—"
    start_time = _fmt_time(appointment.start_time) if appointment else "—"

    doctor = payment.practice.owner
    subject = f"{patient_name} subió un comprobante de ${amount_display} para el turno del {_fmt_date_short(appointment.scheduled_date) if appointment else '—'}"

    html_body = _build_appointment_html(
        title="Nuevo comprobante de transferencia",
        body_lines=[
            f"Hola {doctor.first_name},",
            f"<strong>{patient_name}</strong> subió un comprobante de transferencia bancaria "
            f"por <strong>${amount_display} {payment.currency}</strong>.",
            f"Fecha de la cita: {scheduled_date}",
            f"Hora: {start_time}",
            "Ingresá al panel de administración para revisar el comprobante y confirmar o rechazar el pago.",
        ],
    )

    send_email(
        to=doctor.email,
        subject=subject,
        html_body=html_body,
        practice=payment.practice,
    )


def send_transfer_confirmed(payment) -> None:
    """
    Notify the tutor that their bank transfer was confirmed by the doctor.

    Sent to: all tutors linked to payment.patient.

    Args:
        payment: The Payment instance (status=COMPLETED).
    """
    from apps.patients.models import TutorPatient

    try:
        appointment = payment.appointment
    except Exception:
        appointment = None

    amount_display = _fmt_clp(payment.amount)
    scheduled_date = _fmt_date(appointment.scheduled_date) if appointment else "—"
    start_time = _fmt_time(appointment.start_time) if appointment else "—"

    tutors_qs = TutorPatient.objects.filter(patient=payment.patient).select_related("tutor")

    for link in tutors_qs:
        tutor = link.tutor

        subject = f"Tu pago fue confirmado — consulta del {_fmt_date_short(appointment.scheduled_date) if appointment else '—'}"
        html_body = _build_appointment_html(
            title="Pago confirmado",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Tu transferencia de <strong>${amount_display} {payment.currency}</strong> "
                f"fue recibida y confirmada por la doctora.",
                f"Tu cita está confirmada para el {scheduled_date} a las {start_time}.",
                f"Servicio: {appointment.service.name}" if appointment and appointment.service else "",
                *(_location_lines(appointment.location) if appointment else []),
            ],
        )

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=payment.practice,
        )


def send_transfer_rejected(payment, reason: str) -> None:
    """
    Notify the tutor that their bank transfer was rejected by the doctor.

    Sent to: all tutors linked to payment.patient.

    Args:
        payment: The Payment instance (status=FAILED).
        reason: Human-readable rejection reason from the doctor.
    """
    from apps.patients.models import TutorPatient

    try:
        appointment = payment.appointment
    except Exception:
        appointment = None

    amount_display = _fmt_clp(payment.amount)
    scheduled_date_short = _fmt_date_short(appointment.scheduled_date) if appointment else "—"

    tutors_qs = TutorPatient.objects.filter(patient=payment.patient).select_related("tutor")

    for link in tutors_qs:
        tutor = link.tutor

        subject = f"Tu pago fue rechazado — consulta del {scheduled_date_short}"
        html_body = _build_appointment_html(
            title="Pago rechazado",
            body_lines=[
                f"Hola {tutor.first_name},",
                f"Lamentamos informarte que tu transferencia de "
                f"<strong>${amount_display} {payment.currency}</strong> fue rechazada.",
                f"Motivo: {reason}",
                "Por favor contactanos para resolver la situación y coordinar el pago.",
            ],
        )

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=payment.practice,
        )


def send_transfer_expired(payment) -> None:
    """
    Notify the tutor that their appointment was cancelled due to missing transfer receipt.

    Sent to: all tutors linked to payment.patient.
    Triggered by the expire_pending_transfers() job.

    Args:
        payment: The Payment instance (status=FAILED after expiry).
    """
    from apps.patients.models import TutorPatient

    try:
        appointment = payment.appointment
    except Exception:
        appointment = None

    scheduled_date_short = _fmt_date_short(appointment.scheduled_date) if appointment else "—"

    tutors_qs = TutorPatient.objects.filter(patient=payment.patient).select_related("tutor")

    for link in tutors_qs:
        tutor = link.tutor

        subject = f"Tu turno fue cancelado — no se recibió comprobante ({scheduled_date_short})"
        html_body = _build_appointment_html(
            title="Turno cancelado",
            body_lines=[
                f"Hola {tutor.first_name},",
                "Tu turno fue cancelado porque no recibimos el comprobante de transferencia "
                "dentro del plazo de 48 horas.",
                "Si querés reservar una nueva cita, podés hacerlo desde nuestra plataforma.",
                "Si ya realizaste la transferencia, por favor contactanos para resolver la situación.",
            ],
        )

        send_email(
            to=tutor.email,
            subject=subject,
            html_body=html_body,
            practice=payment.practice,
        )
