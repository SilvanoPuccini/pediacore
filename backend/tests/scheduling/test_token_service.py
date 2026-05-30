"""
Tests for AppointmentToken model and token_service.

TDD — written BEFORE production code.
"""
from __future__ import annotations

import datetime
import uuid
from unittest.mock import patch

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
    invalidate_appointment_tokens,
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

    def test_cancel_executes_cancellation(self):
        """CANCEL token executes cancel_appointment and returns success=True, status=cancelled."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        # cancel_appointment is lazily imported inside execute_token_action;
        # patch it at the source module so the lazy import picks up the mock.
        with patch("apps.scheduling.services.cancellation.cancel_appointment") as mock_ca:
            mock_ca.return_value = {"appointment": appt, "refund_info": None}
            result = execute_token_action(token.token)
            mock_ca.assert_called_once_with(appt, reason="Cancelled via email link")

        assert result["success"] is True
        assert result["action"] == AppointmentToken.CANCEL
        assert result["status"] == "cancelled"

    def test_cancel_via_token_marks_token_used(self):
        """CANCEL action marks token as used after calling cancel_appointment."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        with patch("apps.scheduling.services.cancellation.cancel_appointment") as mock_ca:
            mock_ca.return_value = {"appointment": appt, "refund_info": None}
            execute_token_action(token.token)

        token.refresh_from_db()
        assert token.used_at is not None

    def test_cancel_via_token_includes_refund_info(self):
        """CANCEL token result includes refund info from cancel_appointment."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        refund_info = {"refund_id": "ref-123", "refund_amount": 5000, "penalty_percentage": 0}
        with patch("apps.scheduling.services.cancellation.cancel_appointment") as mock_ca:
            mock_ca.return_value = {"appointment": appt, "refund_info": refund_info}
            result = execute_token_action(token.token)

        assert result["refund_info"] == refund_info

    def test_cancel_already_cancelled_returns_not_cancellable(self):
        """CANCEL token on already-cancelled appointment returns success=False without consuming token."""
        appt = AppointmentFactory(status=Appointment.CANCELLED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        result = execute_token_action(token.token)

        assert result["success"] is False
        assert result["reason"] == "APPOINTMENT_NOT_CANCELLABLE"
        token.refresh_from_db()
        assert token.used_at is None

    def test_cancel_rescheduled_returns_not_cancellable(self):
        """CANCEL token on rescheduled appointment returns success=False without consuming token."""
        appt = AppointmentFactory(status=Appointment.RESCHEDULED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        result = execute_token_action(token.token)

        assert result["success"] is False
        assert result["reason"] == "APPOINTMENT_NOT_CANCELLABLE"
        token.refresh_from_db()
        assert token.used_at is None

    def test_reschedule_returns_redirect_url(self):
        """RESCHEDULE action returns success=True with reschedule_url, token NOT consumed."""
        from django.conf import settings

        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        token = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.RESCHEDULE,
            expires_at=timezone.now() + timezone.timedelta(hours=24),
            used_at=None,
        )

        result = execute_token_action(token.token)

        assert result["success"] is True
        assert result["action"] == AppointmentToken.RESCHEDULE
        assert result["status"] == "redirect"
        assert "reschedule_url" in result
        expected_url = f"{settings.SITE_URL}/portal/appointments/{appt.pk}/reschedule"
        assert result["reschedule_url"] == expected_url

        # Token NOT consumed for RESCHEDULE
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


# ---------------------------------------------------------------------------
# Phase 4.1: invalidate_appointment_tokens
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestInvalidateAppointmentTokens:
    """invalidate_appointment_tokens utility function."""

    def test_marks_all_unused_tokens_used(self):
        """All unused tokens for the appointment get used_at set."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        t1 = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CONFIRM,
            used_at=None,
        )
        t2 = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            used_at=None,
        )

        count = invalidate_appointment_tokens(appt)

        t1.refresh_from_db()
        t2.refresh_from_db()
        assert t1.used_at is not None
        assert t2.used_at is not None
        assert count == 2

    def test_skips_already_used_tokens(self):
        """Already-used tokens are not touched (used_at stays the same)."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        already_used_at = timezone.now() - timezone.timedelta(hours=1)
        t_used = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CONFIRM,
            used_at=already_used_at,
        )
        t_unused = AppointmentTokenFactory(
            appointment=appt,
            practice=appt.practice,
            action=AppointmentToken.CANCEL,
            used_at=None,
        )

        count = invalidate_appointment_tokens(appt)

        t_used.refresh_from_db()
        t_unused.refresh_from_db()
        assert t_used.used_at == already_used_at  # unchanged
        assert t_unused.used_at is not None  # invalidated
        assert count == 1

    def test_returns_zero_when_no_tokens(self):
        """Returns 0 when the appointment has no unused tokens."""
        appt = AppointmentFactory(status=Appointment.CONFIRMED)
        count = invalidate_appointment_tokens(appt)
        assert count == 0

    def test_does_not_affect_other_appointments(self):
        """Tokens from other appointments are not invalidated."""
        appt1 = AppointmentFactory(status=Appointment.CONFIRMED)
        appt2 = AppointmentFactory(status=Appointment.CONFIRMED)
        t1 = AppointmentTokenFactory(
            appointment=appt1,
            practice=appt1.practice,
            action=AppointmentToken.CONFIRM,
            used_at=None,
        )
        t2 = AppointmentTokenFactory(
            appointment=appt2,
            practice=appt2.practice,
            action=AppointmentToken.CONFIRM,
            used_at=None,
        )

        invalidate_appointment_tokens(appt1)

        t1.refresh_from_db()
        t2.refresh_from_db()
        assert t1.used_at is not None
        assert t2.used_at is None  # untouched
