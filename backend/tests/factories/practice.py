import datetime

import factory
from django.utils import timezone

from apps.practice.models import BlockedSlot, Location, Practice, Service, WorkingHours
from tests.factories.users import DoctorFactory


class PracticeFactory(factory.django.DjangoModelFactory):
    """Factory for creating Practice instances in tests."""

    class Meta:
        model = Practice
        django_get_or_create = ("slug",)

    name = factory.Sequence(lambda n: f"Consultorio Pediátrico {n}")
    slug = factory.Sequence(lambda n: f"consultorio-{n}")
    description = factory.Faker("text", max_nb_chars=200)
    email = factory.Sequence(lambda n: f"contacto{n}@example.com")
    phone = "+56912345678"
    website = "https://estefipediatra.com"
    is_active = True
    owner = factory.SubFactory(DoctorFactory)


class LocationFactory(factory.django.DjangoModelFactory):
    """Factory for creating Location instances in tests."""

    class Meta:
        model = Location
        django_get_or_create = ("practice", "slug")

    practice = factory.SubFactory(PracticeFactory)
    name = factory.Sequence(lambda n: f"Sede {n}")
    slug = factory.Sequence(lambda n: f"sede-{n}")
    address = factory.Faker("street_address")
    city = "Pucón"
    region = "Araucanía"
    phone = "+56912345678"
    email = factory.Sequence(lambda n: f"sede{n}@example.com")
    is_active = True


class ServiceFactory(factory.django.DjangoModelFactory):
    """Factory for creating Service instances in tests."""

    class Meta:
        model = Service
        django_get_or_create = ("practice", "slug")

    practice = factory.SubFactory(PracticeFactory)
    name = factory.Sequence(lambda n: f"Servicio {n}")
    slug = factory.Sequence(lambda n: f"servicio-{n}")
    description = factory.Faker("text", max_nb_chars=100)
    duration_minutes = 30
    price = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)
    is_online_available = False
    is_active = True


class WorkingHoursFactory(factory.django.DjangoModelFactory):
    """Factory for creating WorkingHours instances in tests."""

    class Meta:
        model = WorkingHours
        django_get_or_create = ("location", "day_of_week")

    practice = factory.SubFactory(PracticeFactory)
    location = factory.SubFactory(LocationFactory, practice=factory.SelfAttribute("..practice"))
    day_of_week = WorkingHours.MONDAY
    start_time = datetime.time(9, 0)
    end_time = datetime.time(18, 0)
    is_active = True


class BlockedSlotFactory(factory.django.DjangoModelFactory):
    """Factory for creating BlockedSlot instances in tests."""

    class Meta:
        model = BlockedSlot

    practice = factory.SubFactory(PracticeFactory)
    location = factory.SubFactory(LocationFactory, practice=factory.SelfAttribute("..practice"))
    start_datetime = factory.LazyFunction(lambda: timezone.now().replace(hour=8, minute=0, second=0, microsecond=0))
    end_datetime = factory.LazyFunction(lambda: timezone.now().replace(hour=17, minute=0, second=0, microsecond=0))
    reason = "Feriado"
