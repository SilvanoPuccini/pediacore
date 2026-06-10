from __future__ import annotations

from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.billing.models import Invoice, MonthlyExpense, Payment, PaymentProvider
from apps.core.admin_actions import export_to_xlsx, generate_monthly_report


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display = [
        "id",
        "patient",
        "amount",
        "currency",
        "status",
        "payment_method",
        "paid_at",
        "created_at",
    ]
    list_filter = ["status", "payment_method", "currency", "appointment__location"]
    search_fields = ["patient__first_name", "patient__last_name", "external_id", "notes"]
    list_select_related = ["patient"]
    actions = [export_to_xlsx, generate_monthly_report]
    readonly_fields = [
        "external_id",
        "external_status",
        "metadata",
        "created_at",
        "updated_at",
        "deleted_at",
    ]
    date_hierarchy = "created_at"
    fieldsets = [
        (None, {"fields": ["practice", "appointment", "patient", "paid_by"]}),
        ("Amount", {"fields": ["amount", "currency"]}),
        ("Status", {"fields": ["status", "payment_method", "paid_at", "notes"]}),
        (
            "Provider",
            {
                "fields": ["external_id", "external_status", "metadata"],
                "classes": ["collapse"],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at", "deleted_at"],
                "classes": ["collapse"],
            },
        ),
    ]


@admin.register(Invoice)
class InvoiceAdmin(ModelAdmin):
    list_display = [
        "invoice_number",
        "patient_name",
        "service_description",
        "total",
        "issued_at",
    ]
    list_filter = ["practice"]
    search_fields = ["invoice_number", "patient_name", "patient_rut"]
    list_select_related = ["practice"]
    readonly_fields = [
        "invoice_number",
        "issued_at",
        "created_at",
        "updated_at",
        "deleted_at",
    ]
    date_hierarchy = "issued_at"
    fieldsets = [
        (None, {"fields": ["practice", "payment", "invoice_number"]}),
        ("Patient", {"fields": ["patient_name", "patient_rut"]}),
        ("Service", {"fields": ["service_description"]}),
        ("Amounts", {"fields": ["subtotal", "tax_amount", "total"]}),
        ("File", {"fields": ["pdf_file", "issued_at"]}),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at", "deleted_at"],
                "classes": ["collapse"],
            },
        ),
    ]


@admin.register(MonthlyExpense)
class MonthlyExpenseAdmin(ModelAdmin):
    list_display = ["name", "category", "amount", "is_active", "practice", "created_at"]
    list_filter = ["category", "is_active", "practice"]
    search_fields = ["name", "notes"]
    list_select_related = ["practice"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["practice", "name", "category", "amount", "is_active"]}),
        ("Notes", {"fields": ["notes"]}),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at", "deleted_at"],
                "classes": ["collapse"],
            },
        ),
    ]


@admin.register(PaymentProvider)
class PaymentProviderAdmin(ModelAdmin):
    list_display = ["practice", "provider_type", "is_active", "created_at"]
    list_filter = ["provider_type", "is_active"]
    readonly_fields = ["config", "created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["practice", "provider_type", "is_active"]}),
        (
            "Config",
            {
                "fields": ["config"],
                "classes": ["collapse"],
                "description": "Sensitive credentials — store encrypted values only.",
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at", "deleted_at"],
                "classes": ["collapse"],
            },
        ),
    ]
