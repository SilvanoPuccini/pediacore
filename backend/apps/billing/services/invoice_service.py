"""
Invoice service for PEDIACORE billing.

Handles invoice number generation (sequential per year per practice)
and PDF generation via WeasyPrint from an HTML template.
"""

from __future__ import annotations

import io
import logging
from typing import TYPE_CHECKING

from django.template.loader import render_to_string
from django.utils import timezone

if TYPE_CHECKING:
    from apps.billing.models import Invoice, Payment

logger = logging.getLogger(__name__)


def generate_invoice_number(practice) -> str:
    """
    Generate the next sequential invoice number for a practice in the current year.

    Format: PEDIA-{YYYY}-{NNNNNN}
    The sequence is per practice per year, starting at 1.

    Example: PEDIA-2026-000001, PEDIA-2026-000002, ...
    """
    from apps.billing.models import Invoice

    year = timezone.now().year
    prefix = f"PEDIA-{year}-"

    # Count existing invoices for this practice in this year
    count = (
        Invoice.objects.filter(
            practice=practice,
            invoice_number__startswith=prefix,
        ).count()
    )

    sequence = count + 1
    return f"{prefix}{sequence:06d}"


def create_invoice_for_payment(payment: Payment) -> Invoice:
    """
    Create an Invoice record for a completed payment.

    Denormalizes patient name and service description for PDF stability.
    Generates the invoice number automatically.
    Does NOT generate the PDF at creation time — call generate_invoice_pdf()
    separately to attach the PDF file.
    """
    from apps.billing.models import Invoice

    patient = payment.patient
    patient_name = f"{patient.first_name} {patient.last_name}"
    paid_by = payment.paid_by
    patient_rut = (paid_by.rut if paid_by and paid_by.rut else patient.rut) or ""

    service_description = ""
    if payment.appointment and payment.appointment.service:
        service_description = payment.appointment.service.name
    else:
        service_description = "Consulta médica"

    invoice_number = generate_invoice_number(payment.practice)

    invoice = Invoice.objects.create(
        practice=payment.practice,
        payment=payment,
        invoice_number=invoice_number,
        patient_name=patient_name,
        patient_rut=patient_rut,
        service_description=service_description,
        subtotal=payment.amount,
        tax_amount=0,
        total=payment.amount,
    )

    logger.info("Invoice %s created for Payment #%s", invoice_number, payment.pk)
    return invoice


def generate_invoice_pdf(invoice: Invoice) -> bytes:
    """
    Render the invoice as a PDF using WeasyPrint.

    If WeasyPrint is not installed, falls back to returning the raw HTML bytes
    with a log warning. This allows tests to run without WeasyPrint installed.

    The generated PDF bytes are also saved to invoice.pdf_file.

    Returns:
        bytes: The PDF (or HTML fallback) content.
    """
    STATUS_LABELS = {
        "PENDING": "Pendiente",
        "PROCESSING": "Procesando",
        "COMPLETED": "Pagado",
        "FAILED": "Fallido",
        "REFUNDED": "Reembolsado",
    }

    payment = invoice.payment
    context = {
        "invoice": invoice,
        "payment": payment,
        "practice": invoice.practice,
        "patient": payment.patient,
        "status_display": STATUS_LABELS.get(payment.status, payment.status),
    }

    html_string = render_to_string("billing/invoice.html", context)

    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html_string).write_pdf()
        logger.info("PDF generated for Invoice %s via WeasyPrint", invoice.invoice_number)
    except ImportError:
        logger.warning(
            "WeasyPrint not installed — returning raw HTML for Invoice %s",
            invoice.invoice_number,
        )
        pdf_bytes = html_string.encode("utf-8")

    # Persist the file (best-effort — PDF is still returned if save fails)
    try:
        from django.core.files.base import ContentFile

        filename = f"{invoice.invoice_number}.pdf"
        invoice.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
    except Exception as exc:
        logger.warning(
            "Could not persist PDF for Invoice %s: %s — returning in-memory bytes",
            invoice.invoice_number,
            exc,
        )

    return pdf_bytes
