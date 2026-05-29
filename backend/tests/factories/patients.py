import datetime

import factory

from apps.patients.models import Patient, PatientFile, TutorPatient
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory, UserFactory


class PatientFactory(factory.django.DjangoModelFactory):
    """Factory for creating Patient instances in tests."""

    class Meta:
        model = Patient

    practice = factory.SubFactory(PracticeFactory)
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    date_of_birth = factory.LazyFunction(
        lambda: datetime.date.today() - datetime.timedelta(days=365 * 3)
    )
    sex_at_birth = Patient.M
    rut = None
    blood_type = ""
    allergies = ""
    chronic_conditions = ""
    notes = ""
    is_active = True


class TutorPatientFactory(factory.django.DjangoModelFactory):
    """Factory for creating TutorPatient link instances in tests."""

    class Meta:
        model = TutorPatient
        django_get_or_create = ("tutor", "patient")

    practice = factory.SubFactory(PracticeFactory)
    tutor = factory.SubFactory(UserFactory)
    patient = factory.SubFactory(PatientFactory, practice=factory.SelfAttribute("..practice"))
    relationship = TutorPatient.OTHER
    is_primary = False


class PatientFileFactory(factory.django.DjangoModelFactory):
    """Factory for creating PatientFile instances in tests."""

    class Meta:
        model = PatientFile

    practice = factory.SubFactory(PracticeFactory)
    patient = factory.SubFactory(PatientFactory, practice=factory.SelfAttribute("..practice"))
    uploaded_by = factory.SubFactory(DoctorFactory)
    file = factory.django.FileField(filename="test_file.pdf", data=b"fake pdf content")
    original_filename = factory.Sequence(lambda n: f"document_{n}.pdf")
    file_type = PatientFile.OTHER
    description = ""
    file_size = factory.LazyAttribute(lambda obj: len(b"fake pdf content"))
