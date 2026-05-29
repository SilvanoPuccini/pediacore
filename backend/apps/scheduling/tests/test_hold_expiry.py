"""
TDD tests for hold expiry service (Phase 4).

RED → GREEN cycle:
  - Tests written first (RED), implementation in hold_expiry.py follows.
"""

from __future__ import annotations

import datetime

import pytest
from django.utils import timezone

from apps.billing.models import Payment
from apps.scheduling.models import Appointment
from tests.factories.billing import PaymentFactory
from tests.factories.patients import PatientFactory
from tests.factories.practice import PracticeFactory, ServiceFactory
from tests.factories.scheduling import AppointmentFactory

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _expired_hold_appointment(practice, patient):
    """Create an Appointment in HOLD status with hold_expires_at in the past."""
    service = ServiceFactory(practice=practice, is_active=True)
    appt = AppointmentFactory(
        practice=practice,
        patient=patient,
        service=service,
        status=Appointment.HOLD,
        hold_expires_at=timezone.now() - datetime.timedelta(minutes=5),
    )
    return appt


# ---------------------------------------------------------------------------
# 4.1 test_expire_held_appointments_transitions_status
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExpireHeldAppointmentsTransitionsStatus:
    def test_expire_held_appointments_transitions_status(self):
        """
        RED → GREEN: expired HOLD appointments get status=EXPIRED,
        related PENDING Payment gets status=FAILED.
        Returns count of expired appointments.
        """
        from apps.scheduling.services.hold_expiry import expire_held_appointments

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appt = _expired_hold_appointment(practice, patient)

        # Create a PENDING payment linked to this appointment
        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appt,
            status=Payment.PENDING,
            payment_method=Payment.MERCADOPAGO,
        )

        count = expire_held_appointments()

        appt.refresh_from_db()
        payment.refresh_from_db()

        assert count >= 1
        assert appt.status == Appointment.EXPIRED
        assert payment.status == Payment.FAILED

    def test_expire_only_processes_appointments_with_expired_hold(self):
        """Only appointments with hold_expires_at < now() are expired."""
        from apps.scheduling.services.hold_expiry import expire_held_appointments

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)

        # Future hold — should NOT be expired
        future_hold = AppointmentFactory(
            practice=practice,
            patient=patient,
            service=service,
            status=Appointment.HOLD,
            hold_expires_at=timezone.now() + datetime.timedelta(minutes=10),
        )

        expire_held_appointments()

        future_hold.refresh_from_db()
        assert future_hold.status == Appointment.HOLD


# ---------------------------------------------------------------------------
# 4.2 test_expire_does_not_affect_confirmed
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExpireDoesNotAffectConfirmed:
    def test_expire_does_not_affect_confirmed(self):
        """
        CONFIRMED appointments must NOT be touched even if hold_expires_at is past.
        """
        from apps.scheduling.services.hold_expiry import expire_held_appointments

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)

        confirmed_appt = AppointmentFactory(
            practice=practice,
            patient=patient,
            service=service,
            status=Appointment.CONFIRMED,
            hold_expires_at=timezone.now() - datetime.timedelta(minutes=15),
        )

        expire_held_appointments()

        confirmed_appt.refresh_from_db()
        assert confirmed_appt.status == Appointment.CONFIRMED

    def test_expire_does_not_affect_pending(self):
        """PENDING appointments (not HOLD) must NOT be expired by the task."""
        from apps.scheduling.services.hold_expiry import expire_held_appointments

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)

        pending_appt = AppointmentFactory(
            practice=practice,
            patient=patient,
            service=service,
            status=Appointment.PENDING,
            hold_expires_at=timezone.now() - datetime.timedelta(minutes=5),
        )

        expire_held_appointments()

        pending_appt.refresh_from_db()
        assert pending_appt.status == Appointment.PENDING


# ---------------------------------------------------------------------------
# 4.3 test_expire_idempotent
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExpireIdempotent:
    def test_expire_idempotent(self):
        """
        Running the expiry task twice on an already-expired appointment
        must produce no additional writes or errors, and return 0 for the second run.
        """
        from apps.scheduling.services.hold_expiry import expire_held_appointments

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        appt = _expired_hold_appointment(practice, patient)

        payment = PaymentFactory(
            practice=practice,
            patient=patient,
            appointment=appt,
            status=Payment.PENDING,
            payment_method=Payment.MERCADOPAGO,
        )

        # First run
        expire_held_appointments()

        appt.refresh_from_db()
        payment.refresh_from_db()
        assert appt.status == Appointment.EXPIRED
        assert payment.status == Payment.FAILED

        # Second run — appointment is now EXPIRED, filter by HOLD excludes it
        count_second = expire_held_appointments()
        assert count_second == 0

        # Status must still be EXPIRED, no revert
        appt.refresh_from_db()
        assert appt.status == Appointment.EXPIRED

    def test_expire_no_payment_appointment(self):
        """Expired HOLD appointment without a linked payment must not raise errors."""
        from apps.scheduling.services.hold_expiry import expire_held_appointments

        practice = PracticeFactory()
        patient = PatientFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)

        appt = AppointmentFactory(
            practice=practice,
            patient=patient,
            service=service,
            status=Appointment.HOLD,
            hold_expires_at=timezone.now() - datetime.timedelta(minutes=5),
        )
        # No payment linked

        count = expire_held_appointments()

        appt.refresh_from_db()
        assert count >= 1
        assert appt.status == Appointment.EXPIRED
