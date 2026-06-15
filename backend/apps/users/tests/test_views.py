import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def registered_user(db) -> User:
    return User.objects.create_user(
        email="existing@example.com",
        password="strongpass123",
        first_name="John",
        last_name="Smith",
        role=User.TUTOR,
    )


@pytest.fixture
def authenticated_client(registered_user: User) -> APIClient:
    client = APIClient()
    refresh = RefreshToken.for_user(registered_user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.mark.django_db
class TestUserRegistrationView:
    url = "/api/v1/register/"

    def test_valid_registration_returns_201(self, api_client: APIClient) -> None:
        payload = {
            "email": "newuser@example.com",
            "password": "strongpass123",
            "password_confirm": "strongpass123",
            "first_name": "Maria",
            "last_name": "Lopez",
            "rut": "12345678-5",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_valid_registration_creates_tutor_role(self, api_client: APIClient) -> None:
        payload = {
            "email": "tutor@example.com",
            "password": "strongpass123",
            "password_confirm": "strongpass123",
            "rut": "12345678-5",
        }
        api_client.post(self.url, payload, format="json")
        user = User.objects.get(email="tutor@example.com")
        assert user.role == User.TUTOR

    def test_mismatched_passwords_returns_400(self, api_client: APIClient) -> None:
        payload = {
            "email": "mismatch@example.com",
            "password": "strongpass123",
            "password_confirm": "differentpass456",
            "rut": "12345678-5",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.data

    def test_duplicate_email_returns_400(self, api_client: APIClient, registered_user: User) -> None:
        payload = {
            "email": registered_user.email,
            "password": "strongpass123",
            "password_confirm": "strongpass123",
            "rut": "12345678-5",
        }
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserProfileView:
    url = "/api/v1/profile/"

    def test_authenticated_user_can_retrieve_profile(
        self, authenticated_client: APIClient, registered_user: User
    ) -> None:
        response = authenticated_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == registered_user.email

    def test_unauthenticated_request_returns_401(self, api_client: APIClient) -> None:
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_update_profile(
        self, authenticated_client: APIClient, registered_user: User
    ) -> None:
        payload = {"first_name": "Updated", "last_name": "Name"}
        response = authenticated_client.patch(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        registered_user.refresh_from_db()
        assert registered_user.first_name == "Updated"
        assert registered_user.last_name == "Name"

    def test_profile_update_does_not_change_role(
        self, authenticated_client: APIClient, registered_user: User
    ) -> None:
        payload = {"first_name": "New"}
        authenticated_client.patch(self.url, payload, format="json")
        registered_user.refresh_from_db()
        assert registered_user.role == User.TUTOR
