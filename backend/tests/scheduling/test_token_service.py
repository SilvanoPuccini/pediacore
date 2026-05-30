"""
Tests for AppointmentToken model and token_service.

TDD — written BEFORE production code.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
from django.utils import timezone
from freezegun import freeze_time

from apps.scheduling.models import Appointment, AppointmentToken
from apps.scheduling.services.token_service import (
    TokenExpiredError,
    TokenNotFoundError,
    TokenUsedError,
    create_tokens_for_appointment,
    execute_token_action,
    validate_token,
)
from tests.factories.scheduling import AppointmentFactory, AppointmentTokenFactory


# ---------------------------------------------------------------------------
# Phase 1.1: Model importability and field tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAppointmentTokenModel:
    """AppointmentToken model: fields, constraints, defaults."""

    def test_token_model_is_importable(self):
        """AppointmentToken is importable from scheduling.models."""
        assert AppointmentToken is not None

    def test_token_has_required_fields(self):
        """AppointmentToken has token, action, expires_at, used_at, appointment FK."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token_str = uuid.uuid4().hex
        future = timezone.now() + timezone.timedelta(hours=72)

        token = AppointmentToken.objects.create(
            appointment=appt,
            practice=appt.practice,
            token=token_str,
            action=AppointmentToken.CONFIRM,
            expires_at=future,
        )

        assert token.token == token_str
        assert token.action == AppointmentToken.CONFIRM
        assert token.expires_at == future
        assert token.used_at is None
        assert token.appointment == appt

    def test_token_used_at_nullable(self):
        """used_at is nullable — defaults to None."""
        appt = AppointmentFactory()
        token = AppointmentToken.objects.create(
            appointment=appt,
            practice=appt.practice,
            token=uuid.uuid4().hex,
            action=AppointmentToken.CANCEL,
            expires_at=timezone.now() + timezone.timedelta(hours=72),
        )
        assert token.used_at is None

    def test_token_unique_constraint(self):
        """token field has DB-level unique constraint."""
        from django.db import IntegrityError

        appt = AppointmentFactory()
        token_str = uuid.uuid4().hex
        future = timezone.now() + timezone.timedelta(hours=72)

        AppointmentToken.objects.create(
            appointment=appt,
            practice=appt.practice,
            token=token_str,
            action=AppointmentToken.CONFIRM,
            expires_at=future,
        )
        with pytest.raises(IntegrityError):
            AppointmentToken.objects.create(
                appointment=appt,
                practice=appt.practice,
                token=token_str,
                action=AppointmentToken.CANCEL,
                expires_at=future,
            )

    def test_action_choices(self):
        """All 3 action choices are valid (CONFIRM, CANCEL, RESCHEDULE)."""
        assert AppointmentToken.CONFIRM == "CONFIRM"
        assert AppointmentToken.CANCEL == "CANCEL"
        assert AppointmentToken.RESCHEDULE == "RESCHEDULE"

    def test_factory_creates_valid_token(self):
        """AppointmentTokenFactory creates a valid token record."""
        token = AppointmentTokenFactory()
        assert token.pk is not None
        assert token.token
        assert len(token.token) == 32  # uuid4().hex is 32 chars
        assert token.used_at is None


# ---------------------------------------------------------------------------
# Phase 2.1: create_tokens_for_appointment
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateTokensForAppointment:
    """create_tokens_for_appointment service function."""

    def test_creates_three_tokens(self):
        """Creates exactly 3 tokens (CONFIRM, CANCEL, RESCHEDULE)."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        tokens = create_tokens_for_appointment(appt)

        assert len(tokens) == 3
        actions = {t.action for t in tokens}
        assert actions == {AppointmentToken.CONFIRM, AppointmentToken.CANCEL, AppointmentToken.RESCHEDULE}

    def test_tokens_have_correct_expiry(self):
        """Each token expires at now() + APPOINTMENT_TOKEN_EXPIRY_HOURS."""
        from django.conf import settings

        ttl = getattr(settings, "APPOINTMENT_TOKEN_EXPIRY_HOURS", 72)

        with freeze_time("2026-05-29 12:00:00"):
            appt = AppointmentFactory(status=Appointment.CONFIRMED)
            tokens = create_tokens_for_appointment(appt)

        frozen_now = datetime.datetime(2026, 5, 29, 12, 0, 0, tzinfo=datetime.timezone.utc)
        expected_expiry = frozen_now + timezone.timedelta(hours=ttl)
        for token in tokens:
            assert token.expires_at == expected_expiry

    def test_tokens_have_null_used_at(self):
        """All created tokens have used_at = None."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        tokens = create_tokens_for_appointment(appt)
        for token in tokens:
            assert token.used_at is None

    def test_tokens_are_unique(self):
        """Each token string is unique."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        tokens = create_tokens_for_appointment(appt)
        token_strings = [t.token for t in tokens]
        assert len(set(token_strings)) == 3

    def test_idempotent_skips_if_tokens_exist(self):
        """Calling twice for the same appointment skips creation (idempotent)."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        create_tokens_for_appointment(appt)
        tokens_second = create_tokens_for_appointment(appt)

        # Second call returns existing tokens without creating duplicates
        assert AppointmentToken.objects.filter(appointment=appt).count() == 3
        assert len(tokens_second) == 3

    def test_tokens_linked_to_appointment(self):
        """All tokens are linked via FK to the appointment."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        tokens = create_tokens_for_appointment(appt)
        for token in tokens:
            assert token.appointment_id == appt.pk

    def test_tokens_linked_to_practice(self):
        """All tokens are linked to the appointment's practice."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        tokens = create_tokens_for_appointment(appt)
        for token in tokens:
            assert token.practice_id == appt.practice_id


# ---------------------------------------------------------------------------
# Phase 2.1: validate_token
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestValidateToken:
    """validate_token service function."""

    def test_valid_token_returns_token_object(self):
        """A valid unused non-expired token is returned."""
        token = AppointmentTokenFactory(
            action=AppointmentToken.CONFIRM,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )
        result = validate_token(token.token)
        assert result.pk == token.pk

    def test_nonexistent_token_raises_not_found(self):
        """Non-existent token raises TokenNotFoundError."""
        with pytest.raises(TokenNotFoundError):
            validate_token("nonexistenttoken1234567890123456")

    def test_expired_token_raises_expired(self):
        """Expired token raises TokenExpiredError."""
        with freeze_time("2026-05-29 12:00:00"):
            token = AppointmentTokenFactory(
                expires_at=timezone.now() - timezone.timedelta(hours=1),
                used_at=None,
            )
        with pytest.raises(TokenExpiredError):
            validate_token(token.token)

    def test_used_token_raises_used(self):
        """Used token (used_at != None) raises TokenUsedError."""
        token = AppointmentTokenFactory(
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=timezone.now() - timezone.timedelta(hours=1),
        )
        with pytest.raises(TokenUsedError):
            validate_token(token.token)


# ---------------------------------------------------------------------------
# Phase 2.1: execute_token_action
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExecuteTokenAction:
    """execute_token_action service function."""

    def test_confirm_sets_attendance_confirmed(self):
        """CONFIRM token sets attendance_confirmed=True on the appointment."""
        appt = AppointmentFactory(
            status=Appointment.CONFIRMED,
            attendance_confirmed=False,
        )
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CONFIRM,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        result = execute_token_action(token.token)

        appt.refresh_from_db()
        assert appt.attendance_confirmed is True
        assert appt.attendance_confirmed_via == "EMAIL"
        assert appt.attendance_confirmed_at is not None
        assert result["success"] is True

    def test_confirm_marks_token_used(self):
        """CONFIRM action marks token as used (used_at != None)."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CONFIRM,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        execute_token_action(token.token)

        token.refresh_from_db()
        assert token.used_at is not None

    def test_cancel_returns_deferred(self):
        """CANCEL action returns deferred response without mutating appointment."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        result = execute_token_action(token.token)

        appt.refresh_from_db()
        assert appt.status == Appointment.CONFIRMED  # unchanged
        assert result["status"] == "deferred"
        # Token NOT consumed
        token.refresh_from_db()
        assert token.used_at is None

    def test_reschedule_returns_deferred(self):
        """RESCHEDULE action returns deferred without mutating appointment."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.RESCHEDULE,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        result = execute_token_action(token.token)

        appt.refresh_from_db()
        assert appt.status == Appointment.CONFIRMED  # unchanged
        assert result["status"] == "deferred"
        token.refresh_from_db()
        assert token.used_at is None

    def test_expired_token_raises_on_execute(self):
        """Expired token raises TokenExpiredError on execute."""
        token = AppointmentTokenFactory(
            action=AppointmentToken.CONFIRM,
            expires_at=timezone.now() - timezone.timedelta(hours=1),
            used_at=None,
        )
        with pytest.raises(TokenExpiredError):
            execute_token_action(token.token)

    def test_used_token_raises_on_execute(self):
        """Used token raises TokenUsedError on execute."""
        token = AppointmentTokenFactory(
            action=AppointmentToken.CONFIRM,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=timezone.now() - timezone.timedelta(minutes=5),
        )
        with pytest.raises(TokenUsedError):
            execute_token_action(token.token)
