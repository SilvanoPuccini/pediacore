"""
TDD tests for BookingService (Phase 2).

RED → GREEN cycle:
  - Tests written first (RED), implementation follows.
  - hold_appointment() creates Appointment + Payment atomically.
  - Payment is collected later via the CardPayment Brick (process-card endpoint).
"""

from __future__ import annotations

import datetime
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.billing.models import Payment
from apps.scheduling.models import Appointment
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import UserFactory


# ---------------------------------------------------------------------------
# 1.3 Happy path — tutor books presential slot
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHoldAppointmentHappyPath:
    def test_hold_appointment_happy_path(self):
        """
        hold_appointment() creates Appointment(HOLD) + Payment(PENDING)
        and returns (appointment, payment).
        """
        from apps.scheduling.services.booking_service import hold_appointment

        practice = PracticeFactory()
        doctor = practice.owner
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, price_clp=25000, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        scheduled_date = datetime.date(2026, 7, 1)
        start_time = datetime.time(9, 0)

        appointment, payment = hold_appointment(
            user=tutor,
            practice=practice,
            service=service,
            location=location,
            patient=patient,
            scheduled_date=scheduled_date,
            start_time=start_time,
            is_online=False,
            notes="",
        )

        # Appointment assertions
        assert appointment.pk is not None
        assert appointment.status == Appointment.HOLD
        assert appointment.patient == patient
        assert appointment.service == service
        assert appointment.location == location
        assert appointment.scheduled_date == scheduled_date
        assert appointment.start_time == start_time
        assert appointment.hold_expires_at is not None
        assert appointment.booked_by == tutor
        assert appointment.doctor == doctor

        # Payment assertions
        assert payment.pk is not None
        assert payment.status == Payment.PENDING
        assert payment.payment_method == Payment.MERCADOPAGO
        assert payment.appointment == appointment
        assert payment.patient == patient
        assert payment.amount == Decimal("25000")

    def test_hold_appointment_sets_hold_expires_at_from_settings(self):
        """hold_expires_at must be approximately now + BOOKING_HOLD_MINUTES."""
        from django.conf import settings

        from apps.scheduling.services.booking_service import hold_appointment

        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        before = timezone.now()

        appointment, payment = hold_appointment(
            user=tutor,
            practice=practice,
            service=service,
            location=location,
            patient=patient,
            scheduled_date=datetime.date(2026, 7, 3),
            start_time=datetime.time(11, 0),
            is_online=False,
        )

        after = timezone.now()
        hold_minutes = getattr(settings, "BOOKING_HOLD_MINUTES", 10)

        import datetime as dt

        expected_min = before + dt.timedelta(minutes=hold_minutes - 1)
        expected_max = after + dt.timedelta(minutes=hold_minutes + 1)

        assert expected_min <= appointment.hold_expires_at <= expected_max


# ---------------------------------------------------------------------------
# 1.4 Concurrent booking — slot unavailable
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHoldAppointmentSlotUnavailable:
    def test_hold_appointment_slot_unavailable(self):
        """
        When another appointment already blocks the slot,
        SlotUnavailableError must be raised (→ HTTP 409).
        """
        from apps.scheduling.services.booking_service import SlotUnavailableError, hold_appointment

        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        scheduled_date = datetime.date(2026, 7, 4)
        start_time = datetime.time(9, 0)

        # Pre-create a blocking appointment at the same slot
        AppointmentFactory(
            practice=practice,
            location=location,
            service=service,
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=datetime.time(9, 30),
            status=Appointment.HOLD,
        )

        with pytest.raises(SlotUnavailableError):
            hold_appointment(
                user=tutor,
                practice=practice,
                service=service,
                location=location,
                patient=patient,
                scheduled_date=scheduled_date,
                start_time=start_time,
                is_online=False,
            )


# ---------------------------------------------------------------------------
# 1.5 Patient not owned by the requesting tutor
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHoldAppointmentPatientNotOwned:
    def test_hold_appointment_patient_not_owned(self):
        """
        When the patient belongs to a different tutor,
        PermissionError must be raised (→ HTTP 403).
        """
        from apps.scheduling.services.booking_service import hold_appointment

        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=True)
        tutor = UserFactory()
        other_tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        # patient linked to other_tutor only
        TutorPatientFactory(tutor=other_tutor, patient=patient, practice=practice)

        with pytest.raises(PermissionError):
            hold_appointment(
                user=tutor,
                practice=practice,
                service=service,
                location=location,
                patient=patient,
                scheduled_date=datetime.date(2026, 7, 5),
                start_time=datetime.time(9, 0),
                is_online=False,
            )

        # Verify no Appointment or Payment was persisted
        assert Appointment.objects.filter(patient=patient).count() == 0
        assert Payment.objects.filter(patient=patient).count() == 0


# ---------------------------------------------------------------------------
# 1.6 Service inactive
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHoldAppointmentServiceInactive:
    def test_hold_appointment_service_inactive(self):
        """
        When service.is_active is False,
        ValidationError must be raised (→ HTTP 400).
        """
        from django.core.exceptions import ValidationError

        from apps.scheduling.services.booking_service import hold_appointment

        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, is_active=False)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        with pytest.raises(ValidationError):
            hold_appointment(
                user=tutor,
                practice=practice,
                service=service,
                location=location,
                patient=patient,
                scheduled_date=datetime.date(2026, 7, 6),
                start_time=datetime.time(9, 0),
                is_online=False,
            )


# ---------------------------------------------------------------------------
# T-07: TRANSFER payment method path
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHoldAppointmentTransferPath:
    def _setup(self):
        practice = PracticeFactory(
            bank_name="Banco prepago Tenpo",
            account_type="Cuenta Vista",
            account_number="111128625096",
            account_holder="ESTEFANIA ORTIGOSA",
            account_rut="28625096-3",
            account_email="",
        )
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, price_clp=35000, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        return practice, location, service, tutor, patient

    def test_hold_appointment_transfer_creates_pending_appointment(self):
        """TRANSFER path creates Appointment with status=PENDING (not HOLD)."""
        from apps.scheduling.services.booking_service import hold_appointment

        practice, location, service, tutor, patient = self._setup()

        appointment, payment = hold_appointment(
            user=tutor,
            practice=practice,
            service=service,
            location=location,
            patient=patient,
            scheduled_date=datetime.date(2026, 8, 1),
            start_time=datetime.time(10, 0),
            payment_method="TRANSFER",
        )

        assert appointment.status == Appointment.PENDING

    def test_hold_appointment_transfer_creates_pending_payment(self):
        """TRANSFER path creates Payment with status=PENDING, payment_method=TRANSFER."""
        from apps.scheduling.services.booking_service import hold_appointment

        practice, location, service, tutor, patient = self._setup()

        appointment, payment = hold_appointment(
            user=tutor,
            practice=practice,
            service=service,
            location=location,
            patient=patient,
            scheduled_date=datetime.date(2026, 8, 2),
            start_time=datetime.time(10, 0),
            payment_method="TRANSFER",
        )

        assert payment.status == Payment.PENDING
        assert payment.payment_method == Payment.TRANSFER

    def test_hold_appointment_transfer_sets_transfer_expires_at(self):
        """TRANSFER path sets transfer_expires_at approximately 48h from now."""
        import datetime as dt

        from apps.scheduling.services.booking_service import (
            TRANSFER_EXPIRY_HOURS,
            hold_appointment,
        )

        practice, location, service, tutor, patient = self._setup()

        before = timezone.now()
        appointment, payment = hold_appointment(
            user=tutor,
            practice=practice,
            service=service,
            location=location,
            patient=patient,
            scheduled_date=datetime.date(2026, 8, 3),
            start_time=datetime.time(10, 0),
            payment_method="TRANSFER",
        )
        after = timezone.now()

        assert payment.transfer_expires_at is not None
        expected_min = before + dt.timedelta(hours=TRANSFER_EXPIRY_HOURS - 1)
        expected_max = after + dt.timedelta(hours=TRANSFER_EXPIRY_HOURS + 1)
        assert expected_min <= payment.transfer_expires_at <= expected_max
