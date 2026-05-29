"""
Tests for billing services: payment strategy, invoice, and export.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from apps.billing.models import Payment
from apps.billing.services.invoice_service import (
    create_invoice_for_payment,
    generate_invoice_number,
    generate_invoice_pdf,
)
from apps.billing.services.payment_strategy import (
    CashStrategy,
    MercadoPagoStrategy,
    TransferStrategy,
    get_payment_strategy,
)
from tests.factories.billing import CompletedPaymentFactory, InvoiceFactory, PaymentFactory
from tests.factories.practice import PracticeFactory


@pytest.mark.django_db
class TestPaymentStrategy:
    def test_get_strategy_mercadopago(self) -> None:
        strategy = get_payment_strategy(Payment.MERCADOPAGO)
        assert isinstance(strategy, MercadoPagoStrategy)

    def test_get_strategy_cash(self) -> None:
        strategy = get_payment_strategy(Payment.CASH)
        assert isinstance(strategy, CashStrategy)

    def test_get_strategy_transfer(self) -> None:
        strategy = get_payment_strategy(Payment.TRANSFER)
        assert isinstance(strategy, TransferStrategy)

    def test_get_strategy_unsupported_raises(self) -> None:
        with pytest.raises(ValueError, match="Unsupported"):
            get_payment_strategy("BITCOIN")

    def test_cash_strategy_completes_immediately(self) -> None:
        payment = PaymentFactory(payment_method=Payment.CASH)
        strategy = CashStrategy()
        result = strategy.create_preference(payment)
        payment.refresh_from_db()
        assert payment.status == Payment.COMPLETED
        assert payment.paid_at is not None
        assert result["init_point"] == ""

    def test_mercadopago_strategy_creates_preference(self) -> None:
        """Real SDK call is mocked; verify preference_id stored in metadata."""
        from unittest.mock import MagicMock, patch

        payment = PaymentFactory(
            payment_method=Payment.MERCADOPAGO,
            amount="35000.00",
        )
        mock_response = {
            "response": {
                "id": "TEST-PREF-REAL-001",
                "init_point": "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=TEST-PREF-REAL-001",
            },
            "status": 201,
        }

        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.preference.return_value.create.return_value = mock_response

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            result = strategy.create_preference(payment)

        payment.refresh_from_db()
        # external_id must stay empty — only webhook sets it
        assert payment.external_id == ""
        assert payment.metadata.get("preference_id") == "TEST-PREF-REAL-001"
        assert "init_point" in result
        assert result["preference_id"] == "TEST-PREF-REAL-001"

    def test_mercadopago_webhook_updates_status(self) -> None:
        payment = PaymentFactory(
            payment_method=Payment.MERCADOPAGO,
            external_id="mp-123",
            status=Payment.PROCESSING,
        )
        strategy = MercadoPagoStrategy()
        data = {
            "type": "payment",
            "data": {"id": "mp-123"},
            "status": "approved",
        }
        updated = strategy.process_webhook(data)
        assert updated.status == Payment.COMPLETED
        assert updated.paid_at is not None

    def test_transfer_strategy_stays_pending(self) -> None:
        payment = PaymentFactory(payment_method=Payment.TRANSFER)
        strategy = TransferStrategy()
        result = strategy.create_preference(payment)
        payment.refresh_from_db()
        assert payment.status == Payment.PENDING
        assert "transfer" in result.get("detail", "").lower()


@pytest.mark.django_db
class TestInvoiceService:
    def test_generate_invoice_number_format(self) -> None:
        practice = PracticeFactory()
        number = generate_invoice_number(practice)
        assert number.startswith("PEDIA-")
        # Format: PEDIA-YYYY-NNNNNN = 17 chars
        assert len(number) == 17

    def test_generate_invoice_number_sequential(self) -> None:
        practice = PracticeFactory()
        n1 = generate_invoice_number(practice)
        InvoiceFactory(practice=practice, invoice_number=n1)
        n2 = generate_invoice_number(practice)
        assert n1 != n2
        assert int(n2.split("-")[-1]) == 2

    def test_create_invoice_for_payment(self) -> None:
        payment = CompletedPaymentFactory()
        invoice = create_invoice_for_payment(payment)
        assert invoice.pk is not None
        assert invoice.payment == payment
        assert invoice.total == payment.amount
        assert invoice.patient_name == f"{payment.patient.first_name} {payment.patient.last_name}"

    def test_generate_invoice_pdf_fallback_html(self) -> None:
        invoice = InvoiceFactory()
        pdf_bytes = generate_invoice_pdf(invoice)
        assert len(pdf_bytes) > 0
        invoice.refresh_from_db()
        assert bool(invoice.pdf_file)


@pytest.mark.django_db
class TestExportService:
    def test_export_payments_xlsx_or_unavailable(self) -> None:
        """Test XLSX export if openpyxl is available, skip otherwise."""
        try:
            from apps.billing.services.export_service import export_payments_xlsx

            PaymentFactory()
            qs = Payment.objects.all()
            xlsx_bytes = export_payments_xlsx(qs)
            assert len(xlsx_bytes) > 0
            assert xlsx_bytes[:2] == b"PK"
        except ImportError:
            pytest.skip("openpyxl not installed")

    def test_export_empty_queryset_or_unavailable(self) -> None:
        try:
            from apps.billing.services.export_service import export_payments_xlsx

            qs = Payment.objects.none()
            xlsx_bytes = export_payments_xlsx(qs)
            assert len(xlsx_bytes) > 0
        except ImportError:
            pytest.skip("openpyxl not installed")
