"""
Serializers for the PEDIACORE billing app.

Follows the project pattern of separate Create / List / Detail serializers
where the data shape differs significantly between actions.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.billing.models import Invoice, Payment, PaymentProvider


# ---------------------------------------------------------------------------
# Payment serializers
# ---------------------------------------------------------------------------


class PaymentListSerializer(serializers.ModelSerializer):
    """Compact serializer for payment list views."""

    patient_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_display = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )
    service_name = serializers.SerializerMethodField()
    scheduled_date = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "practice",
            "appointment",
            "patient",
            "patient_name",
            "amount",
            "currency",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "paid_at",
            "created_at",
            "updated_at",
            "service_name",
            "scheduled_date",
            "start_time",
            "location_name",
            "is_online",
            "receipt_file",
            "receipt_uploaded_at",
        ]
        read_only_fields = [
            "id",
            "patient_name",
            "status_display",
            "payment_method_display",
            "created_at",
            "updated_at",
            "service_name",
            "scheduled_date",
            "start_time",
            "location_name",
            "is_online",
            "receipt_file",
            "receipt_uploaded_at",
        ]

    def get_patient_name(self, obj: Payment) -> str:
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_service_name(self, obj: Payment) -> str | None:
        apt = obj.appointment
        return apt.service.name if apt and apt.service else None

    def get_scheduled_date(self, obj: Payment) -> str | None:
        apt = obj.appointment
        return str(apt.scheduled_date) if apt else None

    def get_start_time(self, obj: Payment) -> str | None:
        apt = obj.appointment
        return apt.start_time.strftime("%H:%M") if apt else None

    def get_location_name(self, obj: Payment) -> str | None:
        apt = obj.appointment
        if not apt or not apt.location:
            return None
        loc = apt.location
        return f"{loc.name} — {loc.address}" if loc.address else loc.name

    def get_is_online(self, obj: Payment) -> bool:
        apt = obj.appointment
        return apt.is_online if apt else False


class PaymentDetailSerializer(PaymentListSerializer):
    """Full serializer for payment detail view."""

    paid_by_email = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    patient_rut = serializers.SerializerMethodField()
    has_invoice = serializers.SerializerMethodField()
    invoice_id = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()

    class Meta(PaymentListSerializer.Meta):
        fields = PaymentListSerializer.Meta.fields + [
            "paid_by",
            "paid_by_email",
            "paid_by_name",
            "patient_rut",
            "external_id",
            "external_status",
            "metadata",
            "notes",
            "has_invoice",
            "invoice_id",
            "invoice_number",
            "duration_minutes",
        ]
        read_only_fields = PaymentListSerializer.Meta.read_only_fields + [
            "paid_by_email",
            "paid_by_name",
            "patient_rut",
            "external_id",
            "external_status",
            "metadata",
            "has_invoice",
            "invoice_id",
            "invoice_number",
            "duration_minutes",
        ]

    def get_paid_by_email(self, obj: Payment) -> str | None:
        return obj.paid_by.email if obj.paid_by else None

    def get_paid_by_name(self, obj: Payment) -> str | None:
        if not obj.paid_by:
            return None
        name = obj.paid_by.full_name
        return name if name else obj.paid_by.email

    def get_patient_rut(self, obj: Payment) -> str:
        if obj.paid_by and obj.paid_by.rut:
            return obj.paid_by.rut
        return obj.patient.rut or ""

    def _get_invoice(self, obj: Payment) -> Invoice | None:
        try:
            return obj.invoice
        except Invoice.DoesNotExist:
            return None

    def get_has_invoice(self, obj: Payment) -> bool:
        return self._get_invoice(obj) is not None

    def get_invoice_id(self, obj: Payment) -> int | None:
        inv = self._get_invoice(obj)
        return inv.id if inv else None

    def get_invoice_number(self, obj: Payment) -> str | None:
        inv = self._get_invoice(obj)
        return inv.invoice_number if inv else None

    def get_duration_minutes(self, obj: Payment) -> int | None:
        apt = obj.appointment
        return apt.service.duration_minutes if apt and apt.service else None


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new payment."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "practice",
            "appointment",
            "patient",
            "amount",
            "currency",
            "payment_method",
            "notes",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data: dict) -> Payment:
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            validated_data.setdefault("paid_by", request.user)
        return super().create(validated_data)


class PaymentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for partial updates to a payment (doctor only)."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "status",
            "payment_method",
            "external_id",
            "notes",
            "paid_at",
        ]
        read_only_fields = ["id"]


# ---------------------------------------------------------------------------
# Invoice serializers
# ---------------------------------------------------------------------------


class InvoiceListSerializer(serializers.ModelSerializer):
    """Compact serializer for invoice list views."""

    has_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "practice",
            "payment",
            "invoice_number",
            "patient_name",
            "service_description",
            "total",
            "issued_at",
            "has_pdf",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "issued_at",
            "has_pdf",
        ]

    def get_has_pdf(self, obj: Invoice) -> bool:
        return bool(obj.pdf_file)


class InvoiceDetailSerializer(InvoiceListSerializer):
    """Full serializer for invoice detail view."""

    class Meta(InvoiceListSerializer.Meta):
        fields = InvoiceListSerializer.Meta.fields + [
            "patient_rut",
            "subtotal",
            "tax_amount",
            "pdf_file",
            "created_at",
            "updated_at",
        ]
        read_only_fields = InvoiceListSerializer.Meta.read_only_fields + [
            "patient_rut",
            "subtotal",
            "tax_amount",
            "pdf_file",
            "created_at",
            "updated_at",
        ]


# ---------------------------------------------------------------------------
# Transfer action serializers
# ---------------------------------------------------------------------------


class ReceiptUploadSerializer(serializers.Serializer):
    """Validates the receipt file upload for bank transfer payments."""

    receipt = serializers.FileField()

    def validate_receipt(self, value):
        import os

        # Max 10 MB
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("File size must not exceed 10 MB.")

        allowed_content_types = {
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
        }
        allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png"}

        ext = os.path.splitext(value.name)[1].lower()
        content_type = getattr(value, "content_type", "")

        if ext not in allowed_extensions and content_type not in allowed_content_types:
            raise serializers.ValidationError(
                "Only PDF, JPG, JPEG, and PNG files are accepted."
            )

        return value


class TransferConfirmSerializer(serializers.Serializer):
    """Optional notes when confirming a bank transfer."""

    notes = serializers.CharField(required=False, allow_blank=True, default="")


class TransferRejectSerializer(serializers.Serializer):
    """Required reason when rejecting a bank transfer."""

    reason = serializers.CharField(required=True, allow_blank=False)


# ---------------------------------------------------------------------------
# PaymentProvider serializers
# ---------------------------------------------------------------------------


class PaymentProviderSerializer(serializers.ModelSerializer):
    """Serializer for PaymentProvider CRUD (doctor admin only)."""

    provider_type_display = serializers.CharField(
        source="get_provider_type_display", read_only=True
    )

    class Meta:
        model = PaymentProvider
        fields = [
            "id",
            "practice",
            "provider_type",
            "provider_type_display",
            "is_active",
            "config",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "provider_type_display", "created_at", "updated_at"]
