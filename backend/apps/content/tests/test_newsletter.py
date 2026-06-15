"""
Tests for the newsletter subscription system.

Covers: subscribe endpoint (success, duplicate, reactivate, honeypot, invalid email),
unsubscribe endpoint (valid token, invalid token), and token generation.
"""

from __future__ import annotations

import hashlib
import hmac

import pytest
from django.conf import settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.content.models import Subscriber
from apps.content.services import generate_unsubscribe_token
from tests.factories.content import SubscriberFactory

SUBSCRIBE_URL = "/api/v1/content/subscribe/"
UNSUBSCRIBE_URL = "/api/v1/content/unsubscribe/"


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.mark.django_db
class TestSubscribe:
    def test_subscribe_success(self, api_client: APIClient) -> None:
        response = api_client.post(SUBSCRIBE_URL, {"email": "new@example.com", "name": "Ana"})
        assert response.status_code == status.HTTP_201_CREATED
        assert Subscriber.objects.filter(email="new@example.com", status="ACTIVE").exists()

    def test_subscribe_duplicate_active(self, api_client: APIClient) -> None:
        SubscriberFactory(email="dup@example.com", status="ACTIVE")
        response = api_client.post(SUBSCRIBE_URL, {"email": "dup@example.com"})
        assert response.status_code == status.HTTP_200_OK
        assert Subscriber.objects.filter(email="dup@example.com").count() == 1

    def test_subscribe_reactivate(self, api_client: APIClient) -> None:
        SubscriberFactory(email="old@example.com", status="UNSUBSCRIBED")
        response = api_client.post(SUBSCRIBE_URL, {"email": "old@example.com", "name": "Reactivated"})
        assert response.status_code == status.HTTP_201_CREATED
        sub = Subscriber.objects.get(email="old@example.com")
        assert sub.status == "ACTIVE"
        assert sub.name == "Reactivated"

    def test_subscribe_honeypot_rejected(self, api_client: APIClient) -> None:
        response = api_client.post(
            SUBSCRIBE_URL,
            {"email": "bot@spam.com", "website": "http://spam.com"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert not Subscriber.objects.filter(email="bot@spam.com").exists()

    def test_subscribe_invalid_email(self, api_client: APIClient) -> None:
        response = api_client.post(SUBSCRIBE_URL, {"email": "not-an-email"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_subscribe_email_normalized_lowercase(self, api_client: APIClient, settings) -> None:
        settings.RATELIMIT_ENABLE = False
        response = api_client.post(SUBSCRIBE_URL, {"email": "Test@Example.COM"})
        assert response.status_code == status.HTTP_201_CREATED
        assert Subscriber.objects.filter(email="test@example.com").exists()


@pytest.mark.django_db
class TestUnsubscribe:
    def test_unsubscribe_valid_token(self, api_client: APIClient) -> None:
        sub = SubscriberFactory(email="bye@example.com", status="ACTIVE")
        token = generate_unsubscribe_token(sub.email)
        response = api_client.get(UNSUBSCRIBE_URL, {"token": token, "email": sub.email})
        assert response.status_code == status.HTTP_200_OK
        sub.refresh_from_db()
        assert sub.status == "UNSUBSCRIBED"

    def test_unsubscribe_invalid_token(self, api_client: APIClient) -> None:
        SubscriberFactory(email="stay@example.com", status="ACTIVE")
        response = api_client.get(UNSUBSCRIBE_URL, {"token": "invalid", "email": "stay@example.com"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unsubscribe_missing_params(self, api_client: APIClient) -> None:
        response = api_client.get(UNSUBSCRIBE_URL)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unsubscribe_nonexistent_email(self, api_client: APIClient) -> None:
        email = "ghost@example.com"
        token = generate_unsubscribe_token(email)
        response = api_client.get(UNSUBSCRIBE_URL, {"token": token, "email": email})
        assert response.status_code == status.HTTP_200_OK


class TestTokenGeneration:
    def test_generate_unsubscribe_token(self) -> None:
        email = "test@example.com"
        token = generate_unsubscribe_token(email)
        expected = hmac.new(
            settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
        ).hexdigest()
        assert token == expected

    def test_token_differs_per_email(self) -> None:
        token1 = generate_unsubscribe_token("a@example.com")
        token2 = generate_unsubscribe_token("b@example.com")
        assert token1 != token2
