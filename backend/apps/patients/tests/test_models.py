"""
Unit tests for patients app models.
"""

from datetime import date, timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone

from apps.patients.models import Patient, PatientFile, TutorPatient
from tests.factories.patients import PatientFactory, PatientFileFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory, UserFactory


@pytest.mark.django_db
class TestPatientModel:
    def test_create_patient(self) -> None:
        patient = PatientFactory()
        assert patient.pk is not None
        assert patient.first_name
        assert patient.last_name
        assert patient.date_of_birth
        assert patient.is_active is True

    def test_full_name_property(self) -> None:
        patient = PatientFactory(first_name="María", last_name="González")
        assert patient.full_name == "María González"

    def test_str_equals_full_name(self) -> None:
        patient = PatientFactory(first_name="Juan", last_name="Pérez")
        assert str(patient) == "Juan Pérez"

    def test_age_property_years_and_months(self) -> None:
        # Child born exactly 2 years and 3 months ago
        today = date.today()
        # Go back 2 years and 3 months
        try:
            dob = today.replace(year=today.year - 2, month=today.month - 3)
        except ValueError:
            # Month underflow — wrap around
            month = today.month - 3 + 12
            year = today.year - 3
            dob = today.replace(year=year, month=month)
        patient = PatientFactory(date_of_birth=dob)
        age = patient.age
        assert age["years"] == 2
        assert age["months"] == 3

    def test_age_property_newborn(self) -> None:
        patient = PatientFactory(date_of_birth=date.today())
        age = patient.age
        assert age["years"] == 0
        assert age["months"] == 0

    def test_age_property_returns_dict_with_keys(self) -> None:
        patient = PatientFactory(date_of_birth=date(2020, 1, 15))
        age = patient.age
        assert "years" in age
        assert "months" in age
        assert isinstance(age["years"], int)
        assert isinstance(age["months"], int)

    def test_rut_uniqueness(self) -> None:
        PatientFactory(rut="12345678-9")
        with pytest.raises(IntegrityError):
            PatientFactory(rut="12345678-9")

    def test_rut_can_be_blank(self) -> None:
        p1 = PatientFactory(rut=None)
        p2 = PatientFactory(rut=None)
        assert p1.pk != p2.pk

    def test_soft_delete(self) -> None:
        patient = PatientFactory()
        pk = patient.pk
        patient.soft_delete()

        assert Patient.objects.filter(pk=pk).count() == 0
        assert Patient.objects.all_with_deleted().filter(pk=pk).count() == 1

    def test_soft_delete_is_deleted_property(self) -> None:
        patient = PatientFactory()
        assert patient.is_deleted is False
        patient.soft_delete()
        patient.refresh_from_db()
        # Refresh from all_with_deleted since default manager excludes deleted
        patient_deleted = Patient.objects.all_with_deleted().get(pk=patient.pk)
        assert patient_deleted.is_deleted is True

    def test_restore_after_soft_delete(self) -> None:
        patient = PatientFactory()
        pk = patient.pk
        patient.soft_delete()
        patient_deleted = Patient.objects.all_with_deleted().get(pk=pk)
        patient_deleted.restore()
        assert Patient.objects.filter(pk=pk).exists()


@pytest.mark.django_db
class TestTutorPatientModel:
    def test_create_tutor_patient(self) -> None:
        link = TutorPatientFactory()
        assert link.pk is not None
        assert link.tutor is not None
        assert link.patient is not None

    def test_str_representation(self) -> None:
        tutor = UserFactory(email="mama@example.com", first_name="Ana", last_name="López")
        patient = PatientFactory(first_name="Nico", last_name="López")
        link = TutorPatientFactory(tutor=tutor, patient=patient, relationship=TutorPatient.MOTHER)
        assert str(link) == f"mama@example.com → Nico López (MOTHER)"

    def test_unique_together_tutor_patient(self) -> None:
        link = TutorPatientFactory()
        with pytest.raises(IntegrityError):
            TutorPatient.objects.create(
                practice=link.practice,
                tutor=link.tutor,
                patient=link.patient,
                relationship=TutorPatient.FATHER,
            )

    def test_different_tutors_same_patient_allowed(self) -> None:
        patient = PatientFactory()
        tutor1 = UserFactory()
        tutor2 = UserFactory()
        link1 = TutorPatientFactory(patient=patient, tutor=tutor1)
        link2 = TutorPatientFactory(patient=patient, tutor=tutor2)
        assert link1.pk != link2.pk

    def test_is_primary_default_false(self) -> None:
        link = TutorPatientFactory()
        assert link.is_primary is False


@pytest.mark.django_db
class TestPatientFileModel:
    def test_create_patient_file(self) -> None:
        pf = PatientFileFactory()
        assert pf.pk is not None
        assert pf.original_filename
        assert pf.file_size > 0

    def test_str_representation(self) -> None:
        patient = PatientFactory(first_name="Sofía", last_name="Ramírez")
        pf = PatientFileFactory(patient=patient, original_filename="examen.pdf")
        assert str(pf) == "examen.pdf (Sofía Ramírez)"

    def test_file_type_choices(self) -> None:
        pf = PatientFileFactory(file_type=PatientFile.LAB_RESULT)
        assert pf.file_type == "LAB_RESULT"
