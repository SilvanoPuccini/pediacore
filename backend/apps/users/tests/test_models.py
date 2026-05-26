import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


@pytest.mark.django_db
class TestUserCreation:
    def test_create_user_sets_email_and_default_role(self) -> None:
        user = User.objects.create_user(email="test@example.com", password="securepass123")
        assert user.email == "test@example.com"
        assert user.role == User.VISITOR

    def test_create_user_without_email_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="Email field must be set"):
            User.objects.create_user(email="", password="securepass123")

    def test_create_user_normalizes_email(self) -> None:
        user = User.objects.create_user(email="Test@EXAMPLE.COM", password="securepass123")
        assert user.email == "Test@example.com"

    def test_create_superuser_has_staff_and_superuser_flags(self) -> None:
        user = User.objects.create_superuser(email="admin@example.com", password="adminpass123")
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.is_active is True

    def test_create_superuser_without_is_staff_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="Superuser must have is_staff=True"):
            User.objects.create_superuser(email="admin@example.com", password="adminpass123", is_staff=False)

    def test_create_superuser_without_is_superuser_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="Superuser must have is_superuser=True"):
            User.objects.create_superuser(
                email="admin@example.com", password="adminpass123", is_superuser=False
            )


@pytest.mark.django_db
class TestUserProperties:
    def test_full_name_combines_first_and_last_name(self) -> None:
        user = User.objects.create_user(
            email="jane@example.com",
            password="securepass123",
            first_name="Jane",
            last_name="Doe",
        )
        assert user.full_name == "Jane Doe"

    def test_full_name_strips_whitespace_when_names_are_empty(self) -> None:
        user = User.objects.create_user(email="noname@example.com", password="securepass123")
        assert user.full_name == ""

    def test_is_email_verified_returns_false_when_not_verified(self) -> None:
        user = User.objects.create_user(email="unverified@example.com", password="securepass123")
        assert user.is_email_verified is False

    def test_is_email_verified_returns_true_when_verified(self) -> None:
        user = User.objects.create_user(
            email="verified@example.com",
            password="securepass123",
            email_verified_at=timezone.now(),
        )
        assert user.is_email_verified is True

    def test_str_returns_email(self) -> None:
        user = User.objects.create_user(email="str@example.com", password="securepass123")
        assert str(user) == "str@example.com"
