"""
Tests for Payment transfer receipt fields (T-06).
"""

from __future__ import annotations

import pytest

from apps.billing.models import Payment
from tests.factories.billing import PaymentFactory


@pytest.mark.django_db
class TestPaymentTransferFields:
    def test_new_payment_has_null_receipt_fields(self):
        """New Payment has null receipt_uploaded_at and transfer_expires_at."""
        payment = PaymentFactory()
        assert payment.receipt_file == "" or not payment.receipt_file
        assert payment.receipt_uploaded_at is None
        assert payment.transfer_expires_at is None

    def test_transfer_expires_at_can_be_set(self):
        """transfer_expires_at field accepts and persists a datetime value."""
        from django.utils import timezone
        import datetime

        expires = timezone.now() + datetime.timedelta(hours=48)
        payment = PaymentFactory(transfer_expires_at=expires)
        payment.refresh_from_db()
        assert payment.transfer_expires_at is not None
        # Allow a few seconds of tolerance
        assert abs((payment.transfer_expires_at - expires).total_seconds()) < 5

    def test_receipt_uploaded_at_can_be_set(self):
        """receipt_uploaded_at field accepts and persists a datetime value."""
        from django.utils import timezone

        now = timezone.now()
        payment = PaymentFactory(receipt_uploaded_at=now)
        payment.refresh_from_db()
        assert payment.receipt_uploaded_at is not None

    def test_receipt_fields_null_by_default_on_transfer_payment(self):
        """A TRANSFER payment created without receipt fields has all null."""
        payment = PaymentFactory(payment_method=Payment.TRANSFER)
        assert payment.receipt_uploaded_at is None
        assert payment.transfer_expires_at is None
