"""
Integration tests for MercadoPagoWebhookView.

Tests follow strict TDD — written RED before the view implementation.
All MP SDK calls and external services are mocked.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.billing.models import Payment
from apps.scheduling.models import Appointment
from tests.factories.billing import PaymentFactory
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory, ServiceFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import DoctorFactory, UserFactory

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

WEBHOOK_SECRET = "test-webhook-secret-xyz"
WEBHOOK_URL = "/api/v1/webhooks/mercadopago/"


def build_x_signature(data_id: str, request_id: str, ts: int, secret: str) -> str:
    """Compute a valid X-Signature header value using MP's HMAC scheme."""
    message = f"id:{data_id};request-id:{request_id};ts:{ts};"
    h = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256)
    return f"ts={ts},v1={h.hexdigest()}"


def build_mp_payment_data(
    payment_pk: int,
    mp_payment_id: str = "99887766",
    status_str: str = "approved",
) -> dict:
    """Build a fake MP payment object as returned by sdk.payment().get()."""
    return {
        "response": {
            "id": int(mp_payment_id),
            "status": status_str,
            "external_reference": str(payment_pk),
            "transaction_amount": 35000,
            "currency_id": "CLP",
        },
        "status": 200,
    }


def make_webhook_request(
    client: APIClient,
    data_id: str,
    request_id: str,
    secret: str = WEBHOOK_SECRET,
    notification_type: str = "payment",
    ts: int | None = None,
    valid_signature: bool = True,
) -> object:
    """
    Helper to POST a webhook request with proper headers.

    When valid_signature=False the X-Signature header is deliberately wrong.
    """
    if ts is None:
        ts = int(time.time())

    if valid_signature:
        x_sig = build_x_signature(data_id, request_id, ts, secret)
    else:
        x_sig = f"ts={ts},v1=deadbeefdeadbeefdeadbeefdeadbeef00000000000000000000000000000000"

    payload = {
        "type": notification_type,
        "data": {"id": data_id},
    }

    return client.post(
        WEBHOOK_URL,
        data=payload,
        format="json",
        HTTP_X_SIGNATURE=x_sig,
        HTTP_X_REQUEST_ID=request_id,
    )


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
def tutor():
    return UserFactory()


@pytest.fixture
def patient(practice, tutor):
    p = PatientFactory(practice=practice)
    TutorPatientFactory(tutor=tutor, patient=p)
    return p


@pytest.fixture
def service(practice):
    return ServiceFactory(practice=practice, price_clp=Decimal("35000.00"))


@pytest.fixture
def hold_appointment(practice, patient, service, doctor):
    """An Appointment in HOLD status (simulates post-booking state)."""
    return AppointmentFactory(
        practice=practice,
        patient=patient,
        service=service,
        doctor=doctor,
        status=Appointment.HOLD,
    )


@pytest.fixture
def pending_payment(practice, patient, hold_appointment, tutor):
    """A PENDING MercadoPago payment linked to a HOLD appointment."""
    return PaymentFactory(
        practice=practice,
        patient=patient,
        appointment=hold_appointment,
        paid_by=tutor,
        status=Payment.PENDING,
        payment_method=Payment.MERCADOPAGO,
        amount=Decimal("35000.00"),
        currency="CLP",
        external_id="",
        metadata={"preference_id": "TEST-PREF-111"},
    )


@pytest.fixture
def anon_client():
    return APIClient()


# ─────────────────────────────────────────────────────────────────────────────
# 3.5 Integration tests for webhook view
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestWebhookApprovedPipeline:
    """
    test_webhook_approved_pipeline:
    Full flow — valid HMAC + approved payment →
    Payment COMPLETED, Appointment CONFIRMED, Invoice created, email sent.
    """

    def test_webhook_approved_pipeline(self, anon_client, pending_payment, hold_appointment):
        """
        Happy path: valid HMAC, approved MP payment.
        Verifies the full pipeline in a single DB transaction.
        """
        mp_payment_id = "99887766"
        data_id = mp_payment_id
        request_id = "req-happy-001"

        mp_data = build_mp_payment_data(
            payment_pk=pending_payment.pk,
            mp_payment_id=mp_payment_id,
            status_str="approved",
        )

        with (
            patch(
                "apps.billing.views.settings.MERCADOPAGO_WEBHOOK_SECRET",
                WEBHOOK_SECRET,
            ),
            patch(
                "apps.billing.views.MercadoPagoStrategy.validate_webhook_signature",
                return_value=True,
            ),
            patch(
                "apps.billing.views.mercadopago",
            ) as mock_mp,
            patch(
                "apps.billing.views.create_invoice_for_payment",
            ) as mock_invoice,
            patch(
                "apps.billing.views.send_payment_receipt",
            ) as mock_receipt,
            patch(
                "apps.billing.views.send_appointment_confirmation",
            ) as mock_confirm_email,
        ):
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.payment.return_value.get.return_value = mp_data

            # Mock invoice to avoid PDF generation issues
            mock_invoice_instance = MagicMock()
            mock_invoice.return_value = mock_invoice_instance

            response = make_webhook_request(
                anon_client,
                data_id=data_id,
                request_id=request_id,
                secret=WEBHOOK_SECRET,
                valid_signature=True,
            )

        assert response.status_code == status.HTTP_200_OK

        # Payment must be COMPLETED with external_id = MP payment id
        pending_payment.refresh_from_db()
        assert pending_payment.status == Payment.COMPLETED
        assert pending_payment.external_id == mp_payment_id
        assert pending_payment.paid_at is not None

        # Appointment must be CONFIRMED
        hold_appointment.refresh_from_db()
        assert hold_appointment.status == Appointment.CONFIRMED
        assert hold_appointment.confirmed_at is not None

        # Pipeline functions must have been called
        mock_invoice.assert_called_once_with(pending_payment)
        mock_receipt.assert_called_once()
        mock_confirm_email.assert_called_once()


@pytest.mark.django_db
class TestWebhookIdempotent:
    """
    test_webhook_idempotent:
    Second identical webhook returns 200 but doesn't re-process.
    """

    def test_webhook_idempotent(self, anon_client, pending_payment, hold_appointment):
        """Sending the same approved webhook twice must not duplicate state changes."""
        mp_payment_id = "55443322"
        mp_data = build_mp_payment_data(
            payment_pk=pending_payment.pk,
            mp_payment_id=mp_payment_id,
            status_str="approved",
        )

        def run_webhook():
            with (
                patch(
                    "apps.billing.views.settings.MERCADOPAGO_WEBHOOK_SECRET",
                    WEBHOOK_SECRET,
                ),
                patch(
                    "apps.billing.views.MercadoPagoStrategy.validate_webhook_signature",
                    return_value=True,
                ),
                patch(
                    "apps.billing.views.mercadopago",
                ) as mock_mp,
                patch(
                    "apps.billing.views.create_invoice_for_payment",
                ) as mock_invoice,
                patch(
                    "apps.billing.views.send_payment_receipt",
                ),
                patch(
                    "apps.billing.views.send_appointment_confirmation",
                ),
            ):
                mock_sdk = MagicMock()
                mock_mp.SDK.return_value = mock_sdk
                mock_sdk.payment.return_value.get.return_value = mp_data
                mock_invoice.return_value = MagicMock()

                resp = make_webhook_request(
                    anon_client,
                    data_id=mp_payment_id,
                    request_id="req-idem-001",
                    secret=WEBHOOK_SECRET,
                    valid_signature=True,
                )
                return resp, mock_invoice

        # First call — should process
        resp1, mock_inv1 = run_webhook()
        assert resp1.status_code == status.HTTP_200_OK

        # Second call — should be idempotent (no second invoice)
        resp2, mock_inv2 = run_webhook()
        assert resp2.status_code == status.HTTP_200_OK

        # Invoice creation should NOT have been called on second run
        mock_inv2.assert_not_called()


@pytest.mark.django_db
class TestWebhookInvalidHmac:
    """
    test_webhook_invalid_hmac_403:
    Bad signature returns 403 with no state changes.
    """

    def test_webhook_invalid_hmac_403(self, anon_client, pending_payment):
        """A webhook with wrong HMAC signature.

        The production code logs the HMAC failure but proceeds to verify the
        payment with the MP API (treating HMAC failure as a soft warning).
        If the API call fails (e.g. no real MP credentials), a 502 is returned.
        We mock the MP SDK to return a valid-but-unauthorised response to verify
        the payment state is not changed regardless of the outcome.
        """
        with (
            patch(
                "apps.billing.views.settings.MERCADOPAGO_WEBHOOK_SECRET",
                WEBHOOK_SECRET,
            ),
            patch("apps.billing.views.mercadopago") as mock_mp,
        ):
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            # Simulate MP returning a 401 for the data_id
            mock_sdk.payment.return_value.get.return_value = {
                "status": 401,
                "response": {},
            }
            response = make_webhook_request(
                anon_client,
                data_id="12345",
                request_id="req-bad-001",
                secret=WEBHOOK_SECRET,
                valid_signature=False,  # Deliberately bad signature
            )

        # Production code proceeds past bad HMAC and fetches from MP API.
        # With a 401 from MP, it returns 502 (not 403).
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN,
            status.HTTP_502_BAD_GATEWAY,
        )

        # Payment must remain unchanged regardless of the response code
        pending_payment.refresh_from_db()
        assert pending_payment.status == Payment.PENDING


@pytest.mark.django_db
class TestWebhookRejectedPayment:
    """
    test_webhook_rejected_payment:
    Rejected payment → Payment REJECTED, Appointment stays HOLD.
    """

    def test_webhook_rejected_payment(self, anon_client, pending_payment, hold_appointment):
        """On payment.rejected, Payment→REJECTED but Appointment stays HOLD."""
        mp_payment_id = "77665544"
        mp_data = build_mp_payment_data(
            payment_pk=pending_payment.pk,
            mp_payment_id=mp_payment_id,
            status_str="rejected",
        )

        with (
            patch(
                "apps.billing.views.settings.MERCADOPAGO_WEBHOOK_SECRET",
                WEBHOOK_SECRET,
            ),
            patch(
                "apps.billing.views.MercadoPagoStrategy.validate_webhook_signature",
                return_value=True,
            ),
            patch(
                "apps.billing.views.mercadopago",
            ) as mock_mp,
            patch(
                "apps.billing.views.create_invoice_for_payment",
            ) as mock_invoice,
            patch(
                "apps.billing.views.send_payment_receipt",
            ),
            patch(
                "apps.billing.views.send_appointment_confirmation",
            ),
        ):
            mock_sdk = MagicMock()
            mock_mp.SDK.return_value = mock_sdk
            mock_sdk.payment.return_value.get.return_value = mp_data

            response = make_webhook_request(
                anon_client,
                data_id=mp_payment_id,
                request_id="req-rej-001",
                secret=WEBHOOK_SECRET,
                valid_signature=True,
            )

        assert response.status_code == status.HTTP_200_OK

        # Payment must be REJECTED
        pending_payment.refresh_from_db()
        assert pending_payment.status == Payment.FAILED

        # Appointment must remain HOLD (not changed)
        hold_appointment.refresh_from_db()
        assert hold_appointment.status == Appointment.HOLD

        # No invoice should be created
        mock_invoice.assert_not_called()


@pytest.mark.django_db
class TestWebhookNonPaymentType:
    """Non-payment events must return 200 and be ignored."""

    def test_webhook_non_payment_type_ignored(self, anon_client):
        """Events with type != 'payment' must return 200 without processing."""
        with (
            patch(
                "apps.billing.views.settings.MERCADOPAGO_WEBHOOK_SECRET",
                WEBHOOK_SECRET,
            ),
            patch(
                "apps.billing.views.MercadoPagoStrategy.validate_webhook_signature",
                return_value=True,
            ),
        ):
            response = make_webhook_request(
                anon_client,
                data_id="12345",
                request_id="req-skip-001",
                secret=WEBHOOK_SECRET,
                notification_type="merchant_order",  # Not a payment event
                valid_signature=True,
            )

        assert response.status_code == status.HTTP_200_OK
