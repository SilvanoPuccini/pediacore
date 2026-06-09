from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.billing.views import (
    CashFlowView,
    InvoiceViewSet,
    MercadoPagoWebhookView,
    MonthlyExpenseViewSet,
    PaymentProviderViewSet,
    PaymentViewSet,
    TaxCalculatorView,
)

app_name = "billing"

router = DefaultRouter()
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"admin/payment-providers", PaymentProviderViewSet, basename="admin-payment-providers")
router.register(r"monthly-expenses", MonthlyExpenseViewSet, basename="monthly-expense")

urlpatterns = [
    path("", include(router.urls)),
    path("webhooks/mercadopago/", MercadoPagoWebhookView.as_view(), name="mp-webhook"),
    path("tax-calculator/", TaxCalculatorView.as_view(), name="tax-calculator"),
    path("cash-flow/", CashFlowView.as_view(), name="cash-flow"),
]
