"""
Payment Strategy pattern for PEDIACORE billing.

Defines the abstract PaymentStrategy interface and concrete implementations
for each supported payment provider. New providers (e.g., Stripe for Fase 2)
only need to implement the PaymentStrategy interface.

MercadoPago integration uses the official mercadopago Python SDK v2.
MERCADOPAGO_ACCESS_TOKEN must be set in settings (read from .env via decouple).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

import mercadopago
from django.conf import settings
from django.utils import timezone

if TYPE_CHECKING:
    from apps.billing.models import Payment

logger = logging.getLogger(__name__)


class PaymentStrategy(ABC):
    """
    Abstract base for all payment provider strategies.

    Each concrete strategy handles preference creation (initiating a payment)
    and webhook processing (receiving payment status updates from the provider).
    """

    @abstractmethod
    def create_preference(self, payment: Payment) -> dict:
        """
        Create a payment preference with the provider.

        Returns a dict with at minimum:
          - init_point: URL to redirect the user to complete payment
          - preference_id: provider-side preference identifier
        """
        ...

    @abstractmethod
    def process_webhook(self, data: dict) -> Payment:
        """
        Process a webhook notification from the provider.

        Updates the Payment record with the current status from the provider.
        Returns the updated Payment instance.
        """
        ...


class MercadoPagoStrategy(PaymentStrategy):
    """
    MercadoPago payment strategy — real SDK integration.

    Uses the official mercadopago Python SDK v2.
    Preference creation stores the preference_id in payment.metadata.
    external_id is set only after the webhook fires with the real MP payment_id.
    """

    def __init__(self, access_token: str = "") -> None:
        self.access_token = access_token or getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "")

    def _get_sdk(self) -> mercadopago.SDK:
        """Return an initialized MercadoPago SDK instance."""
        return mercadopago.SDK(self.access_token)

    def create_preference(self, payment: Payment) -> dict:
        """
        Create a MercadoPago payment preference via the real SDK.

        Builds a preference with:
          - item: service name, unit_price as int(CLP), quantity=1
          - external_reference: str(payment.pk) for webhook lookup
          - back_urls: success/failure/pending from settings
          - notification_url: webhook endpoint from settings
          - auto_return: "approved"

        Stores preference_id in payment.metadata["preference_id"].
        Does NOT set external_id — that is set only when the webhook fires.

        Returns:
            dict with keys: init_point, preference_id
        """
        logger.info("MercadoPago: creating preference for Payment #%s", payment.pk)

        # Resolve service description from the linked appointment
        service_name = "Consulta pediátrica"
        if payment.appointment and payment.appointment.service:
            service_name = payment.appointment.service.name

        # CLP amounts must be integers for MercadoPago.
        # payment.amount may be Decimal or a string representation from the factory.
        from decimal import Decimal

        unit_price = int(Decimal(str(payment.amount)))

        # Build back_urls from settings (with safe fallbacks)
        frontend_url = getattr(settings, "FRONTEND_URL", "https://estefipediatra.com")
        notification_url = getattr(
            settings,
            "MERCADOPAGO_NOTIFICATION_URL",
            f"{getattr(settings, 'BACKEND_URL', 'https://api.estefipediatra.com')}/api/v1/webhooks/mercadopago/",
        )

        preference_data = {
            "items": [
                {
                    "title": service_name,
                    "quantity": 1,
                    "unit_price": unit_price,
                    "currency_id": payment.currency or "CLP",
                }
            ],
            "external_reference": str(payment.pk),
            "back_urls": {
                "success": f"{frontend_url}/booking/success",
                "failure": f"{frontend_url}/booking/failure",
                "pending": f"{frontend_url}/booking/pending",
            },
            "auto_return": "approved",
            "notification_url": notification_url,
        }

        sdk = self._get_sdk()
        response = sdk.preference().create(preference_data)

        # MP SDK returns a dict: {"response": {...}, "status": 201}
        if response.get("status") not in (200, 201):
            raise RuntimeError(
                f"MercadoPago preference creation failed: status={response.get('status')} "
                f"response={response.get('response')}"
            )

        preference_obj = response["response"]
        preference_id = preference_obj["id"]
        init_point = preference_obj.get("init_point", "")

        # Store preference_id in metadata; external_id stays empty until webhook
        payment.metadata = {
            "provider": "mercadopago",
            "preference_id": preference_id,
        }
        payment.external_id = ""
        payment.save(update_fields=["metadata", "external_id", "updated_at"])

        logger.info(
            "MercadoPago: preference created preference_id=%s for Payment #%s",
            preference_id,
            payment.pk,
        )

        return {
            "init_point": init_point,
            "preference_id": preference_id,
        }

    @staticmethod
    def validate_webhook_signature(
        headers: dict,
        data_id: str,
        request_id: str,
        secret: str,
    ) -> bool:
        """
        Validate the X-Signature header from a MercadoPago webhook.

        MP's scheme:
          Header: X-Signature: ts={ts},v1={hash}
          Message: "id:{data_id};request-id:{request_id};ts:{ts};"
          Hash: HMAC-SHA256(message, secret)

        Args:
            headers: Django request META dict (keys are HTTP_X_SIGNATURE, etc.)
            data_id: The data.id value from the webhook payload.
            request_id: The x-request-id header value.
            secret: MERCADOPAGO_WEBHOOK_SECRET from settings.

        Returns:
            True if signature is valid, False otherwise (never raises).
        """
        try:
            signature_header = headers.get("HTTP_X_SIGNATURE", "")
            if not signature_header:
                logger.warning("MercadoPago webhook: missing X-Signature header")
                return False

            # Parse ts and v1 from "ts=...,v1=..."
            parts = {}
            for part in signature_header.split(","):
                if "=" in part:
                    key, _, value = part.partition("=")
                    parts[key.strip()] = value.strip()

            ts = parts.get("ts")
            v1 = parts.get("v1")

            if not ts or not v1:
                logger.warning("MercadoPago webhook: malformed X-Signature header: %s", signature_header)
                return False

            # Build the message per MP's documented scheme
            message = f"id:{data_id};request-id:{request_id};ts:{ts};"
            expected = hmac.new(
                secret.encode("utf-8"),
                message.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            valid = hmac.compare_digest(expected, v1)
            if not valid:
                logger.warning("MercadoPago webhook: invalid signature")
            return valid

        except Exception as exc:  # noqa: BLE001
            logger.error("MercadoPago webhook: signature validation error: %s", exc)
            return False

    def process_webhook(self, data: dict) -> Payment:
        """
        Process a MercadoPago IPN/webhook notification.

        Expects data with at minimum:
          - type: "payment"
          - data.id: MP payment ID (external_id on our side)

        Maps MP status values to our internal Payment.STATUS_CHOICES.
        """
        from apps.billing.models import Payment

        mp_payment_id = str(data.get("data", {}).get("id", ""))
        mp_status = data.get("status", "")

        logger.info(
            "MercadoPago webhook: payment_id=%s status=%s",
            mp_payment_id,
            mp_status,
        )

        # Map MP statuses to internal statuses
        status_map: dict[str, str] = {
            "approved": Payment.COMPLETED,
            "pending": Payment.PENDING,
            "in_process": Payment.PROCESSING,
            "rejected": Payment.FAILED,
            "refunded": Payment.REFUNDED,
            "cancelled": Payment.FAILED,
        }

        try:
            payment = Payment.objects.get(external_id=mp_payment_id)
        except Payment.DoesNotExist:
            logger.warning("MercadoPago webhook: no payment with external_id=%s", mp_payment_id)
            raise

        internal_status = status_map.get(mp_status, Payment.FAILED)
        payment.status = internal_status
        payment.external_status = mp_status
        payment.metadata.update({"last_webhook": data})

        update_fields = ["status", "external_status", "metadata", "updated_at"]

        if internal_status == Payment.COMPLETED and not payment.paid_at:
            payment.paid_at = timezone.now()
            update_fields.append("paid_at")

        payment.save(update_fields=update_fields)
        return payment


class CashStrategy(PaymentStrategy):
    """
    Cash payment strategy.

    No external provider needed — marks the payment as COMPLETED immediately
    when the doctor records a cash payment.
    """

    def create_preference(self, payment: Payment) -> dict:
        """
        Complete the cash payment immediately.

        No external checkout URL is needed — the doctor records the cash
        payment directly in the system.
        """
        payment.status = payment.COMPLETED
        payment.paid_at = timezone.now()
        payment.external_status = "cash_collected"
        payment.save(update_fields=["status", "paid_at", "external_status", "updated_at"])

        return {
            "init_point": "",
            "preference_id": "",
            "detail": "Cash payment recorded. No external checkout needed.",
        }

    def process_webhook(self, data: dict) -> Payment:
        """Cash payments have no webhook — this is a no-op."""
        raise NotImplementedError("Cash payments do not use webhooks.")


class TransferStrategy(PaymentStrategy):
    """
    Bank transfer payment strategy.

    Records the transfer details and marks payment as PROCESSING until
    the doctor confirms receipt and manually sets it to COMPLETED.
    """

    def create_preference(self, payment: Payment) -> dict:
        """Record the transfer intent. Payment stays PENDING until confirmed."""
        payment.status = payment.PENDING
        payment.external_status = "transfer_pending"
        payment.save(update_fields=["status", "external_status", "updated_at"])

        return {
            "init_point": "",
            "preference_id": "",
            "detail": "Transfer payment recorded. Awaiting confirmation.",
        }

    def process_webhook(self, data: dict) -> Payment:
        """Transfer payments have no webhook — this is a no-op."""
        raise NotImplementedError("Transfer payments do not use webhooks.")


def get_payment_strategy(provider_type: str, config: dict | None = None) -> PaymentStrategy:
    """
    Factory function that returns the correct PaymentStrategy for the given provider type.

    Args:
        provider_type: One of Payment.PAYMENT_METHOD_CHOICES values.
        config: Provider-specific config (e.g., access_token for MercadoPago).

    Returns:
        A concrete PaymentStrategy instance.

    Raises:
        ValueError: If the provider_type is not supported.
    """
    from apps.billing.models import Payment

    config = config or {}

    strategies: dict[str, PaymentStrategy] = {
        Payment.MERCADOPAGO: MercadoPagoStrategy(
            access_token=config.get("access_token", ""),
        ),
        Payment.CASH: CashStrategy(),
        Payment.TRANSFER: TransferStrategy(),
    }

    strategy = strategies.get(provider_type)
    if strategy is None:
        raise ValueError(f"Unsupported payment provider: {provider_type!r}. " f"Supported: {list(strategies.keys())}")
    return strategy
