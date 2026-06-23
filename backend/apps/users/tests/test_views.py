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


@pytest.mark.django_db
class TestChangePasswordView:
    url = "/api/v1/change-password/"

    def test_valid_change_returns_200(self, authenticated_client: APIClient) -> None:
        payload = {"current_password": "strongpass123", "new_password": "newstrong456"}
        response = authenticated_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_wrong_current_password_returns_400(
        self, authenticated_client: APIClient
    ) -> None:
        payload = {"current_password": "wrongpass", "new_password": "newstrong456"}
        response = authenticated_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "incorrecta" in response.data.get("detail", "")

    def test_missing_fields_returns_400(
        self, authenticated_client: APIClient
    ) -> None:
        response = authenticated_client.post(self.url, {"current_password": ""}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_returns_401(self, api_client: APIClient) -> None:
        payload = {"current_password": "strongpass123", "new_password": "newstrong456"}
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_weak_new_password_returns_400(
        self, authenticated_client: APIClient
    ) -> None:
        payload = {"current_password": "strongpass123", "new_password": "123"}
        response = authenticated_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAvatarUploadView:
    url = "/api/v1/profile/avatar/"

    def test_upload_valid_image_returns_200(
        self, authenticated_client: APIClient
    ) -> None:
        import io

        img = io.BytesIO(b"fake-png-content")
        img.name = "avatar.png"
        response = authenticated_client.post(
            self.url, {"avatar": img}, format="multipart"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_upload_no_file_returns_400(
        self, authenticated_client: APIClient
    ) -> None:
        response = authenticated_client.post(self.url, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_invalid_type_returns_400(
        self, authenticated_client: APIClient
    ) -> None:
        import io

        f = io.BytesIO(b"<svg></svg>")
        f.name = "avatar.svg"
        response = authenticated_client.post(
            self.url, {"avatar": f}, format="multipart"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_unauthenticated_returns_401(self, api_client: APIClient) -> None:
        import io

        f = io.BytesIO(b"fake-png")
        f.name = "avatar.png"
        response = api_client.post(self.url, {"avatar": f}, format="multipart")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_avatar_returns_204(
        self, authenticated_client: APIClient
    ) -> None:
        response = authenticated_client.delete(self.url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_unauthenticated_returns_401(self, api_client: APIClient) -> None:
        response = api_client.delete(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestPasswordResetRequestView:
    url = "/api/v1/password-reset/"

    def test_valid_email_returns_200(self, api_client: APIClient) -> None:
        response = api_client.post(
            self.url, {"email": "existing@example.com"}, format="json"
        )
        # Always returns 200 regardless of whether email exists (no info leak)
        assert response.status_code == status.HTTP_200_OK

    def test_unknown_email_also_returns_200(self, api_client: APIClient) -> None:
        response = api_client.post(
            self.url, {"email": "unknown@example.com"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_no_email_returns_200(self, api_client: APIClient) -> None:
        # Always returns 200 to avoid leaking whether an email is registered
        response = api_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_invalid_email_returns_200(self, api_client: APIClient) -> None:
        # Always returns 200 to avoid leaking whether an email is registered
        response = api_client.post(
            self.url, {"email": "not-an-email"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
