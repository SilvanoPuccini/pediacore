"""
Tests for Practice bank account fields and BankDetailsView (T-05, T-13).
"""

from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.practice.models import Practice
from tests.factories.practice import PracticeFactory


@pytest.mark.django_db
class TestPracticeBankAccountFields:
    def test_practice_has_bank_account_fields(self):
        """Practice can be created and all 6 bank fields default to empty string."""
        practice = PracticeFactory()
        assert hasattr(practice, "bank_name")
        assert hasattr(practice, "account_type")
        assert hasattr(practice, "account_number")
        assert hasattr(practice, "account_holder")
        assert hasattr(practice, "account_rut")
        assert hasattr(practice, "account_email")
        # All default to empty string
        assert practice.bank_name == ""
        assert practice.account_type == ""
        assert practice.account_number == ""
        assert practice.account_holder == ""
        assert practice.account_rut == ""
        assert practice.account_email == ""

    def test_practice_bank_fields_can_be_set(self):
        """Practice bank fields accept and persist values."""
        practice = PracticeFactory(
            bank_name="Banco Test",
            account_type="Cuenta Vista",
            account_number="000000000000",
            account_holder="TITULAR TEST",
            account_rut="00000000-0",
            account_email="test@example.com",
        )
        practice.refresh_from_db()
        assert practice.bank_name == "Banco Test"
        assert practice.account_type == "Cuenta Vista"
        assert practice.account_number == "000000000000"
        assert practice.account_holder == "TITULAR TEST"
        assert practice.account_rut == "00000000-0"
        assert practice.account_email == "test@example.com"

    def test_existing_practice_unaffected_by_migration(self):
        """Existing Practice records have empty bank fields after migration."""
        practice = PracticeFactory()
        # Fields exist and are empty — no crash, no regression
        assert practice.bank_name == ""
        assert practice.account_number == ""


@pytest.mark.django_db
class TestBankDetailsView:
    def test_bank_details_returns_all_six_fields(self):
        """Unauthenticated GET /api/v1/practice/bank-details/ returns 200 with 6 keys."""
        PracticeFactory(
            bank_name="Banco Test",
            account_type="Cuenta Vista",
            account_number="000000000000",
            account_holder="TITULAR TEST",
            account_rut="00000000-0",
            account_email="",
        )
        client = APIClient()
        url = reverse("practice:bank-details")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "bank_name" in data
        assert "account_type" in data
        assert "account_number" in data
        assert "account_holder" in data
        assert "account_rut" in data
        assert "account_email" in data

    def test_bank_details_reflects_practice_model(self):
        """Response values match what was set on the Practice record."""
        PracticeFactory(
            bank_name="Banco Test",
            account_type="Cuenta Vista",
            account_number="000000000000",
            account_holder="TITULAR TEST",
            account_rut="00000000-0",
            account_email="",
        )
        client = APIClient()
        url = reverse("practice:bank-details")
        response = client.get(url)
        data = response.json()
        assert data["bank_name"] == "Banco Test"
        assert data["account_number"] == "000000000000"
        assert data["account_holder"] == "TITULAR TEST"
        assert data["account_rut"] == "00000000-0"

    def test_bank_details_no_practice_returns_empty_strings(self):
        """When no Practice exists, returns 200 with empty strings."""
        client = APIClient()
        url = reverse("practice:bank-details")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["bank_name"] == ""
        assert data["account_number"] == ""
