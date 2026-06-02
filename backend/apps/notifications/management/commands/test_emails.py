"""Send all 8 email templates to a test address for visual QA."""

from django.core.management.base import BaseCommand

from apps.notifications.services.email_service import (
    _build_appointment_html,
    _build_payment_receipt_html,
    _location_lines,
    send_email,
)


class Command(BaseCommand):
    help = "Send all 8 email types to a given address for testing"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="Recipient email address")

    def handle(self, *args, **options):
        to = options["email"]

        # Try real data, fallback to demo
        try:
            from apps.scheduling.models import Appointment

            apt = (
                Appointment.objects.select_related("patient", "service", "location")
                .order_by("-created_at")
                .first()
            )
            p = str(apt.patient)
            s = apt.service.name
            f = str(apt.scheduled_date)
            h = apt.start_time.strftime("%H:%M")
            loc = _location_lines(apt.location)
        except Exception:
            p = "Juanito Puccini"
            s = "Control Niño Sano"
            f = "2026-06-15"
            h = "10:00"
            loc = ["Lugar: Centro Clínico El Valle, Pucón"]

        tu = {
            "confirm": "https://estefipediatra.com/a/test/",
            "cancel": "https://estefipediatra.com/a/test/",
            "reschedule": "https://estefipediatra.com/a/test/",
        }

        # Payment data
        amt = "25.000"
        cur = "CLP"
        ppat = p
        ld = "Centro Clínico El Valle — Pucón"
        try:
            from apps.billing.models import Invoice, Payment

            pay = (
                Payment.objects.select_related(
                    "patient", "appointment__service", "appointment__location"
                )
                .order_by("-created_at")
                .first()
            )
            if pay:
                try:
                    amt = f"{int(pay.amount):,}".replace(",", ".")
                except (TypeError, ValueError):
                    amt = str(pay.amount)
                cur = pay.currency
                ppat = str(pay.patient)
                pa = pay.appointment
                if pa and pa.location:
                    ld = pa.location.name
                    if pa.location.address:
                        ld += f" — {pa.location.address}"
        except Exception:
            pass

        emails = [
            (
                "1/8 Bienvenida",
                "[TEST] Bienvenida",
                _build_appointment_html(
                    title="&iexcl;Bienvenida/o!",
                    body_lines=[
                        f"Hola {to.split('@')[0].title()},",
                        "Tu cuenta fue creada correctamente. Ya podés acceder a "
                        "todos los servicios de la Dra. Estefi.",
                    ],
                ),
            ),
            (
                "2/8 Confirmación",
                f"[TEST] Consulta confirmada — {f}",
                _build_appointment_html(
                    title="Consulta confirmada",
                    body_lines=[
                        "Hola Silvano,",
                        f"La consulta de {p} ha sido <strong>confirmada</strong>.",
                        f"Fecha: {f}",
                        f"Hora: {h}",
                        f"Servicio: {s}",
                        *loc,
                    ],
                    token_urls=tu,
                ),
            ),
            (
                "3/8 Recordatorio",
                f"[TEST] Recordatorio — {f}",
                _build_appointment_html(
                    title="Recordatorio de consulta",
                    body_lines=[
                        "Hola Silvano,",
                        f"Recordatorio de la consulta de {p} para el "
                        f"<strong>{f}</strong> a las <strong>{h}</strong>.",
                        f"Servicio: {s}",
                        *loc,
                        "Si necesitás cancelar o reprogramar, contactanos.",
                    ],
                ),
            ),
            (
                "4/8 Recordatorio 24h",
                "[TEST] Tu cita es mañana",
                _build_appointment_html(
                    title="Recordatorio: tu cita es mañana",
                    body_lines=[
                        "Hola Silvano,",
                        f"Recordatorio: consulta de {p} <strong>mañana {f}</strong> "
                        f"a las <strong>{h}</strong>.",
                        f"Servicio: {s}",
                        *loc,
                    ],
                    token_urls=tu,
                ),
            ),
            (
                "5/8 Recordatorio 2h",
                "[TEST] Consulta online en 2 horas",
                _build_appointment_html(
                    title="Tu consulta online empieza en 2 horas",
                    body_lines=[
                        "Hola Silvano,",
                        f"La consulta online de {p} comienza hoy a las "
                        f"<strong>{h}</strong>.",
                        "Enlace de reunión: <a href='https://meet.google.com/abc'>"
                        "https://meet.google.com/abc</a>",
                    ],
                    token_urls=tu,
                ),
            ),
            (
                "6/8 Reagendamiento",
                f"[TEST] Cita reagendada — {f}",
                _build_appointment_html(
                    title="Tu cita ha sido reagendada",
                    body_lines=[
                        "Hola Silvano,",
                        f"Tu consulta de {p} ha sido <strong>reagendada</strong>.",
                        f"Nueva fecha: {f}",
                        f"Nueva hora: {h}",
                        f"Servicio: {s}",
                        *loc,
                        "Si necesitás cambios, contactanos.",
                    ],
                    token_urls=tu,
                ),
            ),
            (
                "7/8 Cancelación",
                f"[TEST] Consulta cancelada — {f}",
                _build_appointment_html(
                    title="Consulta cancelada",
                    body_lines=[
                        "Hola Silvano,",
                        f"La consulta de {p} del <strong>{f}</strong> ha sido "
                        f"cancelada.",
                        "Por favor contactanos para reprogramar.",
                    ],
                ),
            ),
            (
                "8/8 Comprobante",
                f"[TEST] Comprobante — {f}",
                _build_payment_receipt_html(
                    tutor_name="Silvano",
                    amount_display=amt,
                    currency=cur,
                    patient_name=ppat,
                    service_name=s,
                    scheduled_date=f,
                    start_time=h,
                    location_name=ld,
                    pdf_download_url="",
                ),
            ),
        ]

        ok = 0
        for label, subj, html in emails:
            try:
                send_email(to=to, subject=subj, html_body=html)
                self.stdout.write(self.style.SUCCESS(f"OK {label}"))
                ok += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"FAIL {label}: {e}"))

        self.stdout.write(f"\n{ok}/8 emails enviados a {to}")
