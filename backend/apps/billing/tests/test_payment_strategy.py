"""
Unit tests for MercadoPago payment strategy.

Tests follow strict TDD — written RED, then GREEN by implementing the real SDK.
All tests mock the mercadopago SDK to avoid real API calls.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from apps.billing.models import Payment
from apps.billing.services.payment_strategy import MercadoPagoStrategy
from tests.factories.billing import PaymentFactory
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
def pending_payment(practice):
    """A PENDING MercadoPago payment with amount=15000.00 CLP."""
    return PaymentFactory(
        practice=practice,
        status=Payment.PENDING,
        payment_method=Payment.MERCADOPAGO,
        amount=Decimal("15000.00"),
        currency="CLP",
        external_id="",
        metadata={},
    )


@pytest.fixture
def mp_preference_response():
    """Fake successful MP preference creation response."""
    return {
        "response": {
            "id": "TEST-PREF-12345",
            "init_point": "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=TEST-PREF-12345",
            "sandbox_init_point": "https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=TEST-PREF-12345",
        },
        "status": 201,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3.1 Tests for create_preference
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCreatePreference:
    """Tests for MercadoPagoStrategy.create_preference()."""

    def test_create_preference_stores_preference_id(self, pending_payment, mp_preference_response):
        """
        When MP SDK returns a preference, the preference_id must be stored
        in payment.metadata['preference_id'].
        """
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.preference.return_value.create.return_value = mp_preference_response

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            result = strategy.create_preference(pending_payment)

        pending_payment.refresh_from_db()
        assert pending_payment.metadata.get("preference_id") == "TEST-PREF-12345"
        assert result["preference_id"] == "TEST-PREF-12345"

    def test_create_preference_external_id_null_until_webhook(self, pending_payment, mp_preference_response):
        """
        external_id MUST remain empty after preference creation.
        Only the webhook sets external_id to the real MP payment_id.
        """
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.preference.return_value.create.return_value = mp_preference_response

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            strategy.create_preference(pending_payment)

        pending_payment.refresh_from_db()
        assert pending_payment.external_id == ""

    def test_create_preference_casts_decimal_to_int_clp(self, pending_payment, mp_preference_response):
        """
        CLP amounts must be sent to MP as integers (no decimals).
        amount=15000.00 → unit_price=15000 (int) in the MP payload.
        """
        captured_payload = {}

        def capture_create(payload):
            captured_payload.update(payload)
            return mp_preference_response

        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.preference.return_value.create.side_effect = capture_create

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            strategy.create_preference(pending_payment)

        items = captured_payload.get("items", [])
        assert len(items) == 1
        unit_price = items[0]["unit_price"]
        assert isinstance(unit_price, int), f"unit_price must be int, got {type(unit_price)}"
        assert unit_price == 15000

    def test_create_preference_sets_external_reference_to_payment_pk(self, pending_payment, mp_preference_response):
        """external_reference in the MP payload must be str(payment.pk)."""
        captured_payload = {}

        def capture_create(payload):
            captured_payload.update(payload)
            return mp_preference_response

        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.preference.return_value.create.side_effect = capture_create

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            strategy.create_preference(pending_payment)

        assert captured_payload.get("external_reference") == str(pending_payment.pk)

    def test_create_preference_returns_init_point(self, pending_payment, mp_preference_response):
        """create_preference() must return a dict with init_point URL."""
        with patch("apps.billing.services.payment_strategy.mercadopago") as mock_mp:
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.preference.return_value.create.return_value = mp_preference_response

            strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
            result = strategy.create_preference(pending_payment)

        assert "init_point" in result
        assert "mercadopago" in result["init_point"]


# ─────────────────────────────────────────────────────────────────────────────
# 3.2 Tests for validate_webhook_signature
# ─────────────────────────────────────────────────────────────────────────────


class TestValidateWebhookSignature:
    """Tests for MercadoPagoStrategy.validate_webhook_signature()."""

    SECRET = "test-webhook-secret-abc123"

    def _build_signature_header(self, data_id: str, request_id: str, ts: int) -> dict:
        """Build a valid X-Signature header using the MP HMAC scheme."""
        message = f"id:{data_id};request-id:{request_id};ts:{ts};"
        h = hmac.new(
            self.SECRET.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        )
        v1 = h.hexdigest()
        return {
            "HTTP_X_SIGNATURE": f"ts={ts},v1={v1}",
            "HTTP_X_REQUEST_ID": request_id,
        }

    def test_validate_webhook_signature_valid(self):
        """A correctly signed webhook must return True."""
        ts = int(time.time())
        data_id = "123456789"
        request_id = "req-abc-001"
        headers = self._build_signature_header(data_id, request_id, ts)

        strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
        result = strategy.validate_webhook_signature(
            headers=headers,
            data_id=data_id,
            request_id=request_id,
            secret=self.SECRET,
        )

        assert result is True

    def test_validate_webhook_signature_invalid(self):
        """A tampered or wrong signature must return False."""
        ts = int(time.time())
        data_id = "123456789"
        request_id = "req-abc-001"

        # Build valid headers but use wrong secret for sign
        headers = {
            "HTTP_X_SIGNATURE": f"ts={ts},v1=deadbeefdeadbeefdeadbeefdeadbeef",
            "HTTP_X_REQUEST_ID": request_id,
        }

        strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
        result = strategy.validate_webhook_signature(
            headers=headers,
            data_id=data_id,
            request_id=request_id,
            secret=self.SECRET,
        )

        assert result is False

    def test_validate_webhook_signature_missing_header_returns_false(self):
        """Missing X-Signature header must return False (not raise)."""
        strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
        result = strategy.validate_webhook_signature(
            headers={},
            data_id="123",
            request_id="req-001",
            secret=self.SECRET,
        )
        assert result is False

    def test_validate_webhook_signature_malformed_header_returns_false(self):
        """A malformed X-Signature (missing ts or v1) must return False."""
        strategy = MercadoPagoStrategy(access_token="TEST-TOKEN")
        result = strategy.validate_webhook_signature(
            headers={"HTTP_X_SIGNATURE": "garbage-value"},
            data_id="123",
            request_id="req-001",
            secret=self.SECRET,
        )
        assert result is False
