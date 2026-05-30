"""
Tests for billing webhook → token creation integration.

TDD — written BEFORE production code changes.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from apps.scheduling.models import Appointment, AppointmentToken
from tests.factories.billing import PaymentFactory
from tests.factories.scheduling import AppointmentFactory


@pytest.mark.django_db
class TestWebhookTokenCreation:
    """After approved payment webhook, tokens are created for the appointment."""

    def _make_mp_response(self, payment_pk: int, mp_payment_id: str = "12345") -> dict:
        return {
            "status": 200,
            "response": {
                "id": mp_payment_id,
                "status": "approved",
                "external_reference": str(payment_pk),
            },
        }

    @patch("apps.billing.views.MercadoPagoStrategy.validate_webhook_signature", return_value=True)
    @patch("apps.billing.views.mercadopago.SDK")
    def test_tokens_created_after_approved_payment(self, mock_sdk_class, mock_sig):
        """After approved webhook, 3 AppointmentToken records exist for the appointment."""
        appt = AppointmentFactory(status=Appointment.HOLD)
        payment = PaymentFactory(appointment=appt, practice=appt.practice)

        mock_sdk = MagicMock()
        mock_sdk.payment.return_value.get.return_value = self._make_mp_response(payment.pk)
        mock_sdk_class.return_value = mock_sdk

        from rest_framework.test import APIClient

        client = APIClient()
        client.post(
            "/api/v1/webhooks/mercadopago/",
            data={"type": "payment", "data": {"id": "12345"}},
            format="json",
        )

        assert AppointmentToken.objects.filter(appointment=appt).count() == 3

    @patch("apps.billing.views.MercadoPagoStrategy.validate_webhook_signature", return_value=True)
    @patch("apps.billing.views.mercadopago.SDK")
    def test_tokens_have_all_three_action_types(self, mock_sdk_class, mock_sig):
        """Tokens cover CONFIRM, CANCEL, RESCHEDULE actions."""
        appt = AppointmentFactory(status=Appointment.HOLD)
        payment = PaymentFactory(appointment=appt, practice=appt.practice)

        mock_sdk = MagicMock()
        mock_sdk.payment.return_value.get.return_value = self._make_mp_response(payment.pk)
        mock_sdk_class.return_value = mock_sdk

        from rest_framework.test import APIClient

        client = APIClient()
        client.post(
            "/api/v1/webhooks/mercadopago/",
            data={"type": "payment", "data": {"id": "12345"}},
            format="json",
        )

        actions = set(AppointmentToken.objects.filter(appointment=appt).values_list("action", flat=True))
        assert actions == {AppointmentToken.CONFIRM, AppointmentToken.CANCEL, AppointmentToken.RESCHEDULE}

    @patch("apps.billing.views.MercadoPagoStrategy.validate_webhook_signature", return_value=True)
    @patch("apps.billing.views.mercadopago.SDK")
    def test_token_failure_does_not_break_payment_flow(self, mock_sdk_class, mock_sig):
        """If token creation fails, the webhook still returns 200 OK."""
        appt = AppointmentFactory(status=Appointment.HOLD)
        payment = PaymentFactory(appointment=appt, practice=appt.practice)

        mock_sdk = MagicMock()
        mock_sdk.payment.return_value.get.return_value = self._make_mp_response(payment.pk)
        mock_sdk_class.return_value = mock_sdk

        from rest_framework.test import APIClient

        client = APIClient()

        with patch(
            "apps.scheduling.services.token_service.create_tokens_for_appointment",
            side_effect=Exception("Simulated failure"),
        ):
            response = client.post(
                "/api/v1/webhooks/mercadopago/",
                data={"type": "payment", "data": {"id": "12345"}},
                format="json",
            )

        assert response.status_code == 200
