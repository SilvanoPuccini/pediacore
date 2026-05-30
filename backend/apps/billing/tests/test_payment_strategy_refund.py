"""
Unit tests for PaymentStrategy.refund() — TDD RED phase.

Tests cover:
- MercadoPagoStrategy.refund() calls the MP SDK with the correct integer amount
- MercadoPagoStrategy.refund() raises PaymentRefundError on non-2xx response
- CashStrategy.refund() returns manual no-op dict without any API call
- TransferStrategy.refund() returns manual no-op dict without any API call
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from apps.billing.models import Payment
from apps.billing.services.payment_strategy import (
    CashStrategy,
    MercadoPagoStrategy,
    PaymentRefundError,
    TransferStrategy,
)
from tests.factories.billing import CompletedPaymentFactory
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def doctor():
    return DoctorFactory()


@pytest.fixture
def practice(doctor):
    return PracticeFactory(owner=doctor)


@pytest.fixture
def completed_payment(practice):
    """A COMPLETED MercadoPago payment with external_id set."""
    return CompletedPaymentFactory(
        practice=practice,
        payment_method=Payment.MERCADOPAGO,
        amount=Decimal("15000.00"),
        currency="CLP",
        external_id="MP-PAYMENT-98765",
        metadata={"provider": "mercadopago", "preference_id": "PREF-001"},
    )


@pytest.fixture
def mp_refund_response_success():
    """Fake successful MP refund response."""
    return {
        "response": {
            "id": 12345678,
            "payment_id": 98765,
            "amount": 15000,
            "status": "approved",
        },
        "status": 201,
    }


@pytest.fixture
def mp_refund_response_error():
    """Fake MP refund error response (non-2xx)."""
    return {
        "response": {"message": "The payment can't be refunded"},
        "status": 400,
    }


# ─────────────────────────────────────────────────────────────────────────────
# MercadoPagoStrategy.refund() tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestMercadoPagoStrategyRefund:
    """Tests for MercadoPagoStrategy.refund()."""

    def test_refund_calls_sdk_with_correct_payment_id(self, completed_payment, mp_refund_response_success):
        """The refund call must use the payment's external_id as the MP payment ID."""
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.refund.return_value.create.return_value = mp_refund_response_success

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            strategy.refund(completed_payment, 15000)

        mock_sdk.refund.return_value.create.assert_called_once_with(
            completed_payment.external_id,
            {"amount": 15000},
        )

    def test_refund_amount_sent_as_integer_clp(self, completed_payment, mp_refund_response_success):
        """Amount passed to the MP SDK must be an integer (CLP has no decimals)."""
        captured_body = {}

        def capture_create(payment_id, body):
            captured_body.update(body)
            return mp_refund_response_success

        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.refund.return_value.create.side_effect = capture_create

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            strategy.refund(completed_payment, 7500)

        assert isinstance(captured_body.get("amount"), int)
        assert captured_body["amount"] == 7500

    def test_refund_returns_dict_with_refund_id_and_status(self, completed_payment, mp_refund_response_success):
        """On success, refund() must return a dict with refund_id and status."""
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.refund.return_value.create.return_value = mp_refund_response_success

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            result = strategy.refund(completed_payment, 15000)

        assert "refund_id" in result
        assert "status" in result
        assert result["refund_id"] == "12345678"
        assert result["status"] == "approved"

    def test_refund_raises_payment_refund_error_on_non_2xx(self, completed_payment, mp_refund_response_error):
        """When MP API returns a non-2xx status, PaymentRefundError must be raised."""
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.refund.return_value.create.return_value = mp_refund_response_error

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            with pytest.raises(PaymentRefundError):
                strategy.refund(completed_payment, 15000)

    def test_refund_full_amount_matches_payment_amount(self, completed_payment, mp_refund_response_success):
        """Full refund (penalty=0%): the amount sent equals the full payment amount."""
        full_amount = int(Decimal(str(completed_payment.amount)))

        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.refund.return_value.create.return_value = mp_refund_response_success

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            result = strategy.refund(completed_payment, full_amount)

        assert result["refund_id"] is not None


# ─────────────────────────────────────────────────────────────────────────────
# CashStrategy.refund() tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCashStrategyRefund:
    """Tests for CashStrategy.refund() — manual no-op."""

    def test_cash_refund_returns_success_dict(self, completed_payment):
        """CashStrategy.refund() must return a success dict without API calls."""
        strategy = CashStrategy()
        result = strategy.refund(completed_payment, 15000)

        assert isinstance(result, dict)
        assert result["status"] in ("approved", "manual")

    def test_cash_refund_includes_refund_id(self, completed_payment):
        """CashStrategy.refund() must include a refund_id key."""
        strategy = CashStrategy()
        result = strategy.refund(completed_payment, 15000)

        assert "refund_id" in result

    def test_cash_refund_amount_in_response(self, completed_payment):
        """CashStrategy.refund() must echo back the amount."""
        strategy = CashStrategy()
        result = strategy.refund(completed_payment, 5000)

        assert result.get("amount") == 5000

    def test_cash_refund_does_not_call_external_api(self, completed_payment):
        """No external API should be called for cash refunds."""
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            strategy = CashStrategy()
            strategy.refund(completed_payment, 15000)

        mock_mp.SDK.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# TransferStrategy.refund() tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTransferStrategyRefund:
    """Tests for TransferStrategy.refund() — manual no-op."""

    def test_transfer_refund_returns_success_dict(self, completed_payment):
        """TransferStrategy.refund() must return a success dict without API calls."""
        strategy = TransferStrategy()
        result = strategy.refund(completed_payment, 15000)

        assert isinstance(result, dict)
        assert result["status"] in ("approved", "manual")

    def test_transfer_refund_includes_refund_id(self, completed_payment):
        """TransferStrategy.refund() must include a refund_id key."""
        strategy = TransferStrategy()
        result = strategy.refund(completed_payment, 15000)

        assert "refund_id" in result

    def test_transfer_refund_amount_in_response(self, completed_payment):
        """TransferStrategy.refund() must echo back the amount."""
        strategy = TransferStrategy()
        result = strategy.refund(completed_payment, 8000)

        assert result.get("amount") == 8000

    def test_transfer_refund_does_not_call_external_api(self, completed_payment):
        """No external API should be called for transfer refunds."""
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            strategy = TransferStrategy()
            strategy.refund(completed_payment, 15000)

        mock_mp.SDK.assert_not_called()
