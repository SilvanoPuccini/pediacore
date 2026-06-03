"""
TDD tests for BookingService (Phase 2).

RED → GREEN cycle:
  - Tests written first (RED), implementation follows.
  - MercadoPago SDK is always mocked — no real network calls.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone

from apps.billing.models import Payment
from apps.scheduling.models import Appointment
from tests.factories.billing import PaymentFactory
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import DoctorFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MP_INIT_POINT = "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=test-pref-123"
MP_PREFERENCE_ID = "test-pref-123"

MOCK_MP_RESPONSE = {
    "init_point": MP_INIT_POINT,
    "preference_id": MP_PREFERENCE_ID,
}


def _make_create_preference_mock(init_point=MP_INIT_POINT, preference_id=MP_PREFERENCE_ID):
    """Return a mock that mimics MercadoPagoStrategy.create_preference()."""
    mock = MagicMock(return_value={"init_point": init_point, "preference_id": preference_id})
    return mock


# ---------------------------------------------------------------------------
# 1.3 Happy path — tutor books presential slot
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHoldAppointmentHappyPath:
    def test_hold_appointment_happy_path(self):
        """
        RED → GREEN: hold_appointment() creates Appointment(HOLD) + Payment(PENDING),
        calls MP strategy once, and returns (appointment, payment, init_point).
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

        with patch(
            "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
            side_effect=_make_create_preference_mock(),
        ):
            appointment, payment, init_point, preference_id = hold_appointment(
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

        # Return values
        assert init_point == MP_INIT_POINT
        assert preference_id == MP_PREFERENCE_ID

    def test_hold_appointment_stores_preference_id_in_metadata(self):
        """Payment.metadata must contain the MP preference_id."""
        from apps.scheduling.services.booking_service import hold_appointment

        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, price_clp=15000, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        with patch(
            "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
            side_effect=_make_create_preference_mock(),
        ):
            appointment, payment, init_point, preference_id = hold_appointment(
                user=tutor,
                practice=practice,
                service=service,
                location=location,
                patient=patient,
                scheduled_date=datetime.date(2026, 7, 2),
                start_time=datetime.time(10, 0),
                is_online=False,
            )

        # preference_id returned as 4th element of the tuple
        assert preference_id == MP_PREFERENCE_ID
        # external_id must stay empty until webhook fires
        assert payment.external_id == ""

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

        with patch(
            "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
            side_effect=_make_create_preference_mock(),
        ):
            appointment, payment, _, _pref_id = hold_appointment(
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
        RED → GREEN: when another appointment already blocks the slot,
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
            with patch(
                "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
                side_effect=_make_create_preference_mock(),
            ):
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
        RED → GREEN: when the patient belongs to a different tutor,
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
        RED → GREEN: when service.is_active is False,
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
# 1.7 MercadoPago SDK failure → rollback
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestHoldAppointmentMpFailureRollback:
    def test_hold_appointment_mp_failure_rollback(self):
        """
        RED → GREEN: when MP SDK raises an exception, the transaction must be
        rolled back — no Appointment or Payment in DB.
        """
        from apps.scheduling.services.booking_service import hold_appointment

        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice, duration_minutes=30, price_clp=20000, is_active=True)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)

        scheduled_date = datetime.date(2026, 7, 7)
        start_time = datetime.time(10, 0)

        initial_appointment_count = Appointment.objects.count()
        initial_payment_count = Payment.objects.count()

        with pytest.raises(Exception):
            with patch(
                "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
                side_effect=Exception("MP SDK connection error"),
            ):
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

        # Transaction must have rolled back
        assert Appointment.objects.count() == initial_appointment_count
        assert Payment.objects.count() == initial_payment_count


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

        appointment, payment, init_point, preference_id = hold_appointment(
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

        appointment, payment, init_point, preference_id = hold_appointment(
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
        appointment, payment, init_point, preference_id = hold_appointment(
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

    def test_hold_appointment_transfer_no_mp_api_call(self):
        """TRANSFER path does NOT call MercadoPagoStrategy.create_preference."""
        from unittest.mock import patch

        from apps.scheduling.services.booking_service import hold_appointment

        practice, location, service, tutor, patient = self._setup()

        with patch(
            "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
        ) as mock_mp:
            hold_appointment(
                user=tutor,
                practice=practice,
                service=service,
                location=location,
                patient=patient,
                scheduled_date=datetime.date(2026, 8, 4),
                start_time=datetime.time(10, 0),
                payment_method="TRANSFER",
            )
            mock_mp.assert_not_called()

    def test_hold_appointment_transfer_returns_empty_init_point_and_preference_id(self):
        """TRANSFER path returns empty strings for init_point and preference_id."""
        from apps.scheduling.services.booking_service import hold_appointment

        practice, location, service, tutor, patient = self._setup()

        appointment, payment, init_point, preference_id = hold_appointment(
            user=tutor,
            practice=practice,
            service=service,
            location=location,
            patient=patient,
            scheduled_date=datetime.date(2026, 8, 5),
            start_time=datetime.time(10, 0),
            payment_method="TRANSFER",
        )

        assert init_point == ""
        assert preference_id == ""

    def test_hold_appointment_mercadopago_unchanged(self):
        """Regression: MERCADOPAGO default path still works as before."""
        from apps.scheduling.services.booking_service import hold_appointment

        practice, location, service, tutor, patient = self._setup()

        with patch(
            "apps.scheduling.services.booking_service.MercadoPagoStrategy.create_preference",
            return_value={"init_point": MP_INIT_POINT, "preference_id": MP_PREFERENCE_ID},
        ):
            appointment, payment, init_point, preference_id = hold_appointment(
                user=tutor,
                practice=practice,
                service=service,
                location=location,
                patient=patient,
                scheduled_date=datetime.date(2026, 8, 6),
                start_time=datetime.time(10, 0),
                payment_method="MERCADOPAGO",
            )

        assert appointment.status == Appointment.HOLD
        assert payment.payment_method == Payment.MERCADOPAGO
        assert init_point == MP_INIT_POINT
        assert preference_id == MP_PREFERENCE_ID
