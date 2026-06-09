"""
Billing models for PEDIACORE.

Handles payments (MercadoPago, cash, transfer), internal invoices (PDF),
and payment provider configuration using the Strategy pattern.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class Payment(BaseModel):
    """
    Represents a payment for an appointment.

    Supports multiple payment methods via the Strategy pattern.
    For MercadoPago, external_id stores the MP payment ID and
    external_status stores the raw provider status.
    """

    # Status choices
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

    STATUS_CHOICES = [
        (PENDING, _("Pending")),
        (PROCESSING, _("Processing")),
        (COMPLETED, _("Completed")),
        (FAILED, _("Failed")),
        (REFUNDED, _("Refunded")),
    ]

    # Payment method choices
    MERCADOPAGO = "MERCADOPAGO"
    CASH = "CASH"
    TRANSFER = "TRANSFER"
    OTHER = "OTHER"

    PAYMENT_METHOD_CHOICES = [
        (MERCADOPAGO, _("MercadoPago")),
        (CASH, _("Cash")),
        (TRANSFER, _("Transfer")),
        (OTHER, _("Other")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name=_("practice"),
    )
    appointment = models.OneToOneField(
        "scheduling.Appointment",
        on_delete=models.SET_NULL,
        related_name="payment",
        null=True,
        blank=True,
        verbose_name=_("appointment"),
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name=_("patient"),
    )
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="payments",
        null=True,
        blank=True,
        verbose_name=_("paid by"),
    )
    amount = models.DecimalField(
        _("amount"),
        max_digits=10,
        decimal_places=2,
    )
    currency = models.CharField(
        _("currency"),
        max_length=3,
        default="CLP",
    )
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
    )
    payment_method = models.CharField(
        _("payment method"),
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default=CASH,
    )
    external_id = models.CharField(
        _("external ID"),
        max_length=255,
        blank=True,
        help_text=_("MercadoPago payment ID or other provider reference"),
    )
    external_status = models.CharField(
        _("external status"),
        max_length=50,
        blank=True,
        help_text=_("Raw status string from the payment provider"),
    )
    metadata = models.JSONField(
        _("metadata"),
        default=dict,
        blank=True,
        help_text=_("Raw provider response payload"),
    )
    paid_at = models.DateTimeField(
        _("paid at"),
        null=True,
        blank=True,
    )
    notes = models.TextField(_("notes"), blank=True)

    # ── Transfer receipt fields ───────────────────────────────────────────────
    receipt_file = models.FileField(
        _("receipt file"),
        upload_to="transfer_receipts/",
        blank=True,
    )
    receipt_uploaded_at = models.DateTimeField(
        _("receipt uploaded at"),
        null=True,
        blank=True,
    )
    transfer_expires_at = models.DateTimeField(
        _("transfer expires at"),
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]
        verbose_name = _("payment")
        verbose_name_plural = _("payments")

    def __str__(self) -> str:
        return (
            f"Payment #{self.pk} — {self.patient} — "
            f"{self.amount} {self.currency} ({self.get_status_display()})"
        )


class Invoice(BaseModel):
    """
    Internal comprobante PDF (NOT a SII boleta).

    Generated after a payment is completed. Stores denormalized data
    so the PDF remains consistent even if patient/service data changes.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="invoices",
        verbose_name=_("practice"),
    )
    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        related_name="invoice",
        verbose_name=_("payment"),
    )
    invoice_number = models.CharField(
        _("invoice number"),
        max_length=50,
        unique=True,
        help_text=_("Auto-generated. Format: PEDIA-YYYY-NNNNNN"),
    )
    patient_name = models.CharField(
        _("patient name"),
        max_length=255,
        help_text=_("Denormalized for PDF consistency"),
    )
    patient_rut = models.CharField(
        _("patient RUT"),
        max_length=12,
        blank=True,
    )
    service_description = models.CharField(
        _("service description"),
        max_length=500,
    )
    subtotal = models.DecimalField(
        _("subtotal"),
        max_digits=10,
        decimal_places=2,
    )
    tax_amount = models.DecimalField(
        _("tax amount"),
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    total = models.DecimalField(
        _("total"),
        max_digits=10,
        decimal_places=2,
    )
    issued_at = models.DateTimeField(
        _("issued at"),
        auto_now_add=True,
    )
    pdf_file = models.FileField(
        _("PDF file"),
        upload_to="invoices/",
        blank=True,
    )

    class Meta:
        db_table = "invoices"
        ordering = ["-issued_at"]
        verbose_name = _("invoice")
        verbose_name_plural = _("invoices")

    def __str__(self) -> str:
        return f"Invoice {self.invoice_number} — {self.patient_name} — {self.total} {self.payment.currency}"


class MonthlyExpense(BaseModel):
    """Recurring monthly expenses for the practice."""

    CATEGORY_CHOICES = [
        ("RENT", "Arriendo"),
        ("SUPPLIES", "Insumos médicos"),
        ("SALARY", "Sueldos/Honorarios"),
        ("PLATFORM", "Plataformas digitales"),
        ("INSURANCE", "Seguros"),
        ("UTILITIES", "Servicios básicos"),
        ("TAXES", "Impuestos/Patentes"),
        ("OTHER", "Otros"),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="monthly_expenses",
    )
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    amount = models.PositiveIntegerField(help_text="Monthly amount in CLP")
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-amount"]
        verbose_name = "Monthly expense"
        verbose_name_plural = "Monthly expenses"

    def __str__(self) -> str:
        return f"{self.name} — ${self.amount:,}"


class PaymentProvider(BaseModel):
    """
    Payment provider configuration for the Strategy pattern.

    Each practice can configure one active provider per type.
    The config JSONField stores provider-specific settings (e.g., access tokens).
    Sensitive values should be encrypted at the application level before storing.
    """

    # Provider type choices
    MERCADOPAGO = "MERCADOPAGO"
    STRIPE = "STRIPE"

    PROVIDER_TYPE_CHOICES = [
        (MERCADOPAGO, _("MercadoPago")),
        (STRIPE, _("Stripe")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="payment_providers",
        verbose_name=_("practice"),
    )
    provider_type = models.CharField(
        _("provider type"),
        max_length=20,
        choices=PROVIDER_TYPE_CHOICES,
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
    )
    config = models.JSONField(
        _("config"),
        default=dict,
        blank=True,
        help_text=_("Provider-specific configuration (access tokens, credentials, etc.)"),
    )

    class Meta:
        db_table = "payment_providers"
        ordering = ["-created_at"]
        verbose_name = _("payment provider")
        verbose_name_plural = _("payment providers")
        unique_together = [("practice", "provider_type")]

    def __str__(self) -> str:
        status = "active" if self.is_active else "inactive"
        return f"{self.get_provider_type_display()} ({status}) — {self.practice.name}"
