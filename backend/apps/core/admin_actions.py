"""
Reusable admin actions for PEDIACORE.

Includes XLSX export, email reminders, and PDF report generation.
"""

from __future__ import annotations

from django.contrib import admin
from django.http import HttpResponse


@admin.action(description="Exportar seleccionados a Excel")
def export_to_xlsx(modeladmin, request, queryset):
    """Generic XLSX export action — exports list_display fields."""
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = modeladmin.model._meta.verbose_name_plural.title()

    # Collect field names from list_display, skip callables defined on the admin class
    raw_fields = modeladmin.get_list_display(request)
    fields = []
    for f in raw_fields:
        if f == "__str__":
            continue
        attr = getattr(modeladmin, f, None)
        if callable(attr) and not isinstance(attr, property):
            continue
        fields.append(f)

    # Build header row
    headers = []
    for field in fields:
        try:
            headers.append(modeladmin.model._meta.get_field(field).verbose_name.title())
        except Exception:
            headers.append(field.replace("_", " ").title())
    ws.append(headers)

    # Data rows
    for obj in queryset:
        row = []
        for field in fields:
            val = getattr(obj, field, "")
            if callable(val):
                val = val()
            row.append(str(val) if val is not None else "")
        ws.append(row)

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    filename = f"{modeladmin.model._meta.verbose_name_plural}.xlsx"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    wb.save(response)
    return response


@admin.action(description="Enviar recordatorio por email")
def send_reminder_email(modeladmin, request, queryset):
    """Send a reminder email to the tutors of selected appointments."""
    from apps.notifications.services.email_service import send_email

    sent = 0
    for appointment in queryset.select_related("patient"):
        tutor_emails = list(
            appointment.patient.tutor_patients.filter(deleted_at__isnull=True).values_list(
                "tutor__email", flat=True
            )
        )
        for email in tutor_emails:
            try:
                send_email(
                    to=email,
                    subject=f"Recordatorio: turno {appointment.scheduled_date}",
                    html_body=(
                        f"<p>Hola, te recordamos que tenés un turno el "
                        f"<strong>{appointment.scheduled_date}</strong> a las "
                        f"<strong>{appointment.start_time:%H:%M}</strong> para "
                        f"<strong>{appointment.patient.full_name}</strong>.</p>"
                    ),
                )
                sent += 1
            except Exception:  # noqa: BLE001
                pass
    modeladmin.message_user(request, f"{sent} recordatorio(s) enviado(s).")


@admin.action(description="Generar reporte mensual PDF")
def generate_monthly_report(modeladmin, request, queryset):
    """Generate a PDF summary of selected payments."""
    from django.db.models import Count, Sum
    from django.template.loader import render_to_string
    from django.utils import timezone
    from weasyprint import HTML

    stats = queryset.aggregate(
        total=Sum("amount"),
        count=Count("id"),
    )

    html_string = render_to_string(
        "admin/reports/monthly_report.html",
        {
            "stats": stats,
            "payments": queryset.select_related(
                "appointment__patient",
                "appointment__service",
            ),
            "generated_at": timezone.now(),
            "generated_by": request.user,
        },
    )

    pdf = HTML(string=html_string).write_pdf()
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="reporte_{timezone.localdate()}.pdf"'
    )
    return response
