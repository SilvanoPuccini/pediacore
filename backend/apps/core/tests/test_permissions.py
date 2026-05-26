"""
Tests for custom DRF permissions.

Uses MagicMock for request/view to keep tests fast (no HTTP layer needed).
"""

from unittest.mock import MagicMock

import pytest

from apps.core.permissions import IsDoctor, IsOwnerOrDoctor, IsTutor
from tests.factories.users import DoctorFactory, UserFactory


def _make_request(user) -> MagicMock:
    request = MagicMock()
    request.user = user
    return request


# ---------------------------------------------------------------------------
# IsDoctor
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIsDoctor:
    permission = IsDoctor()

    def test_allows_doctor(self):
        user = DoctorFactory()
        request = _make_request(user)
        assert self.permission.has_permission(request, MagicMock()) is True

    def test_denies_tutor(self):
        user = UserFactory()  # default role = TUTOR
        request = _make_request(user)
        assert self.permission.has_permission(request, MagicMock()) is False

    def test_denies_unauthenticated(self):
        request = MagicMock()
        request.user = MagicMock(is_authenticated=False)
        assert self.permission.has_permission(request, MagicMock()) is False


# ---------------------------------------------------------------------------
# IsTutor
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIsTutor:
    permission = IsTutor()

    def test_allows_tutor(self):
        user = UserFactory()  # default role = TUTOR
        request = _make_request(user)
        assert self.permission.has_permission(request, MagicMock()) is True

    def test_denies_doctor(self):
        user = DoctorFactory()
        request = _make_request(user)
        assert self.permission.has_permission(request, MagicMock()) is False

    def test_denies_unauthenticated(self):
        request = MagicMock()
        request.user = MagicMock(is_authenticated=False)
        assert self.permission.has_permission(request, MagicMock()) is False


# ---------------------------------------------------------------------------
# IsOwnerOrDoctor
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIsOwnerOrDoctor:
    permission = IsOwnerOrDoctor()

    def test_allows_doctor_on_any_object(self):
        doctor = DoctorFactory()
        request = _make_request(doctor)
        obj = MagicMock()  # obj.user is irrelevant for doctor
        assert self.permission.has_object_permission(request, MagicMock(), obj) is True

    def test_allows_owner(self):
        tutor = UserFactory()
        request = _make_request(tutor)
        obj = MagicMock()
        obj.user = tutor
        assert self.permission.has_object_permission(request, MagicMock(), obj) is True

    def test_denies_other_tutor(self):
        tutor = UserFactory()
        other_tutor = UserFactory(email="other@example.com")
        request = _make_request(other_tutor)
        obj = MagicMock()
        obj.user = tutor
        assert self.permission.has_object_permission(request, MagicMock(), obj) is False

    def test_has_permission_requires_authenticated(self):
        request = MagicMock()
        request.user = MagicMock(is_authenticated=False)
        assert self.permission.has_permission(request, MagicMock()) is False

    def test_has_permission_allows_authenticated(self):
        tutor = UserFactory()
        request = _make_request(tutor)
        assert self.permission.has_permission(request, MagicMock()) is True
