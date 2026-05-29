from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.billing.views import (
    InvoiceViewSet,
    MercadoPagoWebhookView,
    PaymentProviderViewSet,
    PaymentViewSet,
)

app_name = "billing"

router = DefaultRouter()
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"admin/payment-providers", PaymentProviderViewSet, basename="admin-payment-providers")

urlpatterns = [
    path("", include(router.urls)),
    path("webhooks/mercadopago/", MercadoPagoWebhookView.as_view(), name="mp-webhook"),
]
