from __future__ import annotations

import datetime
import uuid

import factory
from django.utils import timezone

from apps.scheduling.models import (
    Appointment,
    AppointmentToken,
    AutoResponderConfig,
    CancellationPolicy,
    CancellationTier,
    WaitlistEntry,
)
from tests.factories.patients import PatientFactory
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory
from tests.factories.users import DoctorFactory, UserFactory


class AppointmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Appointment

    practice = factory.SubFactory(PracticeFactory)
    patient = factory.SubFactory(PatientFactory, practice=factory.SelfAttribute("..practice"))
    service = factory.SubFactory(ServiceFactory, practice=factory.SelfAttribute("..practice"))
    location = factory.SubFactory(LocationFactory, practice=factory.SelfAttribute("..practice"))
    doctor = factory.SubFactory(DoctorFactory)
    booked_by = factory.SelfAttribute("doctor")
    scheduled_date = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=7)
    )
    start_time = datetime.time(9, 0)
    end_time = datetime.time(9, 30)
    status = Appointment.PENDING
    is_online = False
    cancellation_reason = ""
    notes = ""


class WaitlistEntryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WaitlistEntry

    practice = factory.SubFactory(PracticeFactory)
    patient = factory.SubFactory(PatientFactory, practice=factory.SelfAttribute("..practice"))
    service = factory.SubFactory(ServiceFactory, practice=factory.SelfAttribute("..practice"))
    location = factory.SubFactory(LocationFactory, practice=factory.SelfAttribute("..practice"))
    preferred_date_start = factory.LazyFunction(
        lambda: datetime.date.today() + datetime.timedelta(days=1)
    )
    preferred_date_end = None
    preferred_time_start = None
    preferred_time_end = None
    status = WaitlistEntry.WAITING
    notes = ""


class CancellationPolicyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CancellationPolicy
        django_get_or_create = ("practice",)

    practice = factory.SubFactory(PracticeFactory)
    is_active = True
    description = "Standard cancellation policy"


class CancellationTierFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CancellationTier

    policy = factory.SubFactory(CancellationPolicyFactory)
    min_hours_before = 48
    penalty_percentage = factory.Sequence(lambda n: f"{n * 25}.00")
    description = factory.Sequence(lambda n: f"Tier {n}")


class AppointmentTokenFactory(factory.django.DjangoModelFactory):
    """Factory for creating AppointmentToken instances in tests."""

    class Meta:
        model = AppointmentToken

    appointment = factory.SubFactory(
        AppointmentFactory,
        status=Appointment.CONFIRMED,
    )
    practice = factory.SelfAttribute("appointment.practice")
    token = factory.LazyFunction(lambda: uuid.uuid4().hex)
    action = AppointmentToken.CONFIRM
    expires_at = factory.LazyFunction(
        lambda: timezone.now() + datetime.timedelta(hours=72)
    )
    used_at = None


class AutoResponderConfigFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = AutoResponderConfig
        django_get_or_create = ("practice",)

    practice = factory.SubFactory(PracticeFactory)
    is_active = False
    outside_hours_message = "We are currently outside working hours."
    holiday_message = "We are on holiday."
