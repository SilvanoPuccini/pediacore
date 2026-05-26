"""
Tests for billing models.
"""

from __future__ import annotations

import pytest
from django.db import IntegrityError

from apps.billing.models import Invoice, Payment, PaymentProvider
from tests.factories.billing import (
    CompletedPaymentFactory,
    InvoiceFactory,
    PaymentFactory,
    PaymentProviderFactory,
)
from tests.factories.practice import PracticeFactory


@pytest.mark.django_db
class TestPaymentModel:
    def test_create_payment(self) -> None:
        payment = PaymentFactory()
        assert payment.pk is not None
        assert payment.status == Payment.PENDING
        assert payment.currency == "CLP"

    def test_payment_str(self) -> None:
        payment = PaymentFactory(amount="50000.00")
        s = str(payment)
        assert "50000" in s
        assert "CLP" in s

    def test_payment_defaults(self) -> None:
        payment = PaymentFactory()
        assert payment.status == Payment.PENDING
        assert payment.payment_method == Payment.CASH
        assert payment.external_id == ""
        assert payment.paid_at is None

    def test_payment_soft_delete(self) -> None:
        payment = PaymentFactory()
        payment.delete()
        assert payment.deleted_at is not None
        assert Payment.objects.filter(pk=payment.pk).count() == 0
        assert Payment.objects.all_with_deleted().filter(pk=payment.pk).count() == 1

    def test_payment_restore(self) -> None:
        payment = PaymentFactory()
        payment.delete()
        payment.restore()
        assert payment.deleted_at is None
        assert Payment.objects.filter(pk=payment.pk).exists()

    def test_payment_status_choices(self) -> None:
        statuses = [c[0] for c in Payment.STATUS_CHOICES]
        assert Payment.PENDING in statuses
        assert Payment.COMPLETED in statuses
        assert Payment.REFUNDED in statuses

    def test_payment_method_choices(self) -> None:
        methods = [c[0] for c in Payment.PAYMENT_METHOD_CHOICES]
        assert Payment.MERCADOPAGO in methods
        assert Payment.CASH in methods
        assert Payment.TRANSFER in methods

    def test_completed_payment_factory(self) -> None:
        payment = CompletedPaymentFactory()
        assert payment.status == Payment.COMPLETED
        assert payment.paid_at is not None


@pytest.mark.django_db
class TestInvoiceModel:
    def test_create_invoice(self) -> None:
        invoice = InvoiceFactory()
        assert invoice.pk is not None
        assert invoice.invoice_number.startswith("PEDIA-")

    def test_invoice_str(self) -> None:
        invoice = InvoiceFactory()
        s = str(invoice)
        assert invoice.invoice_number in s
        assert invoice.patient_name in s

    def test_invoice_number_unique(self) -> None:
        InvoiceFactory(invoice_number="PEDIA-2026-000001")
        with pytest.raises(IntegrityError):
            InvoiceFactory(invoice_number="PEDIA-2026-000001")

    def test_invoice_soft_delete(self) -> None:
        invoice = InvoiceFactory()
        invoice.delete()
        assert invoice.deleted_at is not None
        assert Invoice.objects.filter(pk=invoice.pk).count() == 0

    def test_invoice_one_to_one_payment(self) -> None:
        invoice = InvoiceFactory()
        assert invoice.payment.invoice == invoice


@pytest.mark.django_db
class TestPaymentProviderModel:
    def test_create_provider(self) -> None:
        provider = PaymentProviderFactory()
        assert provider.pk is not None
        assert provider.is_active is True

    def test_provider_str(self) -> None:
        provider = PaymentProviderFactory()
        s = str(provider)
        assert "MercadoPago" in s
        assert "active" in s

    def test_provider_unique_together(self) -> None:
        practice = PracticeFactory()
        PaymentProvider.objects.create(
            practice=practice,
            provider_type=PaymentProvider.MERCADOPAGO,
            is_active=True,
            config={},
        )
        with pytest.raises(IntegrityError):
            PaymentProvider.objects.create(
                practice=practice,
                provider_type=PaymentProvider.MERCADOPAGO,
                is_active=True,
                config={},
            )

    def test_provider_soft_delete(self) -> None:
        provider = PaymentProviderFactory()
        provider.delete()
        assert provider.deleted_at is not None
