"""
Payment Strategy pattern for PEDIACORE billing.

Defines the abstract PaymentStrategy interface and concrete implementations
for each supported payment provider. New providers (e.g., Stripe for Fase 2)
only need to implement the PaymentStrategy interface.

MercadoPago is integrated as a stub for TFM — the interface is production-ready
but the actual SDK calls are mocked. Real integration requires setting
MERCADOPAGO_ACCESS_TOKEN in PaymentProvider.config and calling the SDK.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

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
    MercadoPago payment strategy.

    TFM STUB: implements the full interface but uses mocked SDK responses
    instead of real API calls. Replace the stub bodies with actual
    mercadopago SDK calls when MERCADOPAGO_ACCESS_TOKEN is configured.

    Real implementation would require:
        import mercadopago
        sdk = mercadopago.SDK(access_token)
    """

    def __init__(self, access_token: str = "") -> None:
        self.access_token = access_token

    def create_preference(self, payment: Payment) -> dict:
        """
        Create a MercadoPago payment preference.

        In production this calls mp.preference().create({...}).
        Returns init_point (checkout URL) and preference_id.
        """
        logger.info("MercadoPago: creating preference for Payment #%s", payment.pk)

        # STUB: return a mock response matching the real MP preference shape
        preference_id = f"stub-pref-{payment.pk}"
        init_point = f"https://www.mercadopago.cl/checkout/v1/redirect?pref_id={preference_id}"

        # Update payment to PROCESSING while waiting for user action
        payment.status = payment.PROCESSING
        payment.external_id = preference_id
        payment.external_status = "pending"
        payment.metadata = {
            "provider": "mercadopago",
            "preference_id": preference_id,
            "stub": True,
        }
        payment.save(update_fields=["status", "external_id", "external_status", "metadata", "updated_at"])

        return {
            "init_point": init_point,
            "preference_id": preference_id,
        }

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
        raise ValueError(
            f"Unsupported payment provider: {provider_type!r}. "
            f"Supported: {list(strategies.keys())}"
        )
    return strategy
