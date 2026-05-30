"""
Unit and serializer-level tests for tutor profile completion.

TDD RED phase: all tests reference compute_tutor_completion and
profile_completion field which do NOT exist yet — expected to fail with
ImportError / AttributeError.
"""

from __future__ import annotations

from datetime import datetime

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers — build unsaved User instances to keep unit tests DB-free
# ---------------------------------------------------------------------------

def _make_user(**kwargs) -> User:
    """Return an unsaved User instance with sensible defaults for testing."""
    defaults = {
        "email": "test@example.com",
        "first_name": "Ana",
        "last_name": "García",
        "phone": "+56912345678",
        "email_verified_at": timezone.now(),
    }
    defaults.update(kwargs)
    user = User(**defaults)
    return user


# ---------------------------------------------------------------------------
# Unit tests — compute_tutor_completion (no DB, pure function)
# ---------------------------------------------------------------------------


class TestComputeTutorCompletion:
    """Unit tests for compute_tutor_completion pure service function."""

    def test_all_fields_filled_returns_100(self) -> None:
        """All four fields present → 100% with empty missing list."""
        from apps.users.services.profile_completion import compute_tutor_completion

        user = _make_user(
            first_name="Ana",
            last_name="García",
            phone="+56912345678",
            email_verified_at=timezone.now(),
        )
        result = compute_tutor_completion(user)

        assert result["percentage"] == 100
        assert result["missing"] == []

    def test_all_fields_missing_returns_0(self) -> None:
        """All four fields blank/None → 0% with all four in missing list."""
        from apps.users.services.profile_completion import compute_tutor_completion

        user = _make_user(
            first_name="",
            last_name="",
            phone="",
            email_verified_at=None,
        )
        result = compute_tutor_completion(user)

        assert result["percentage"] == 0
        assert set(result["missing"]) == {"first_name", "last_name", "phone", "email_verified"}

    def test_email_verified_missing_returns_75(self) -> None:
        """Name and phone present but email not verified → 75%."""
        from apps.users.services.profile_completion import compute_tutor_completion

        user = _make_user(
            first_name="Ana",
            last_name="García",
            phone="+56912345678",
            email_verified_at=None,
        )
        result = compute_tutor_completion(user)

        assert result["percentage"] == 75
        assert result["missing"] == ["email_verified"]

    def test_phone_missing_returns_75(self) -> None:
        """Name and email verified but no phone → 75%."""
        from apps.users.services.profile_completion import compute_tutor_completion

        user = _make_user(
            first_name="Ana",
            last_name="García",
            phone="",
            email_verified_at=timezone.now(),
        )
        result = compute_tutor_completion(user)

        assert result["percentage"] == 75
        assert result["missing"] == ["phone"]

    def test_first_and_last_name_missing_returns_50(self) -> None:
        """Phone and email verified but both name fields blank → 50%."""
        from apps.users.services.profile_completion import compute_tutor_completion

        user = _make_user(
            first_name="",
            last_name="",
            phone="+56912345678",
            email_verified_at=timezone.now(),
        )
        result = compute_tutor_completion(user)

        assert result["percentage"] == 50
        assert set(result["missing"]) == {"first_name", "last_name"}

    def test_whitespace_only_first_name_counts_as_missing(self) -> None:
        """Whitespace-only first_name must be treated as blank (strip check)."""
        from apps.users.services.profile_completion import compute_tutor_completion

        user = _make_user(
            first_name="   ",
            last_name="García",
            phone="+56912345678",
            email_verified_at=timezone.now(),
        )
        result = compute_tutor_completion(user)

        assert result["percentage"] == 75
        assert "first_name" in result["missing"]

    def test_email_verified_at_none_counts_as_missing_regardless_of_email(self) -> None:
        """email_verified_at=None must appear in missing even if email address exists."""
        from apps.users.services.profile_completion import compute_tutor_completion

        user = _make_user(
            first_name="Ana",
            last_name="García",
            phone="+56912345678",
            email_verified_at=None,
        )
        result = compute_tutor_completion(user)

        assert "email_verified" in result["missing"]
        assert result["percentage"] <= 75


# ---------------------------------------------------------------------------
# Serializer integration tests — profile_completion key in UserSerializer
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUserSerializerProfileCompletion:
    """Integration tests: profile_completion field wired into UserSerializer."""

    def test_profile_completion_key_present_in_serializer_output(self) -> None:
        """UserSerializer.data must include 'profile_completion' key."""
        from apps.users.serializers import UserSerializer

        user = User.objects.create_user(
            email="serializer@example.com",
            password="pass123",
            first_name="Ana",
            last_name="García",
            phone="+56912345678",
        )
        data = UserSerializer(user).data

        assert "profile_completion" in data
        assert isinstance(data["profile_completion"]["percentage"], int)
        assert isinstance(data["profile_completion"]["missing"], list)

    def test_profile_completion_shape_matches_contract(self) -> None:
        """profile_completion must be {'percentage': int, 'missing': list}."""
        from apps.users.serializers import UserSerializer

        user = User.objects.create_user(
            email="shape@example.com",
            password="pass123",
            first_name="",
            last_name="",
            phone="",
        )
        data = UserSerializer(user).data
        pc = data["profile_completion"]

        assert set(pc.keys()) == {"percentage", "missing"}
        assert 0 <= pc["percentage"] <= 100
        assert isinstance(pc["missing"], list)
