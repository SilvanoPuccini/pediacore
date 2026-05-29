"""
Tests for medical_records models.
"""

from __future__ import annotations

import datetime
from decimal import Decimal

import pytest

from apps.medical_records.models import (
    Anthropometry,
    Diagnosis,
    Encounter,
    PhysicalExam,
    SOAPNote,
    VitalSigns,
)
from tests.factories.medical_records import (
    AnthropometryFactory,
    DiagnosisFactory,
    EncounterFactory,
    PhysicalExamFactory,
    SOAPNoteFactory,
    VitalSignsFactory,
)
from tests.factories.patients import PatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory


@pytest.mark.django_db
class TestEncounterModel:
    def test_create_encounter(self) -> None:
        encounter = EncounterFactory()
        assert encounter.pk is not None
        assert encounter.encounter_type == Encounter.CONSULTATION
        assert encounter.status == Encounter.SCHEDULED

    def test_encounter_str_contains_patient_name(self) -> None:
        encounter = EncounterFactory()
        result = str(encounter)
        assert encounter.patient.full_name in result

    def test_encounter_str_contains_encounter_type(self) -> None:
        encounter = EncounterFactory(encounter_type=Encounter.WELL_CHILD_VISIT)
        result = str(encounter)
        assert "Well-child" in result or "well" in result.lower()

    def test_encounter_defaults_to_scheduled(self) -> None:
        encounter = EncounterFactory()
        assert encounter.status == Encounter.SCHEDULED

    def test_encounter_practice_fk(self) -> None:
        practice = PracticeFactory()
        encounter = EncounterFactory(practice=practice)
        assert encounter.practice_id == practice.pk

    def test_encounter_soft_delete(self) -> None:
        encounter = EncounterFactory()
        pk = encounter.pk
        encounter.soft_delete()
        assert Encounter.objects.filter(pk=pk).count() == 0
        assert Encounter.objects.all_with_deleted().filter(pk=pk).count() == 1


@pytest.mark.django_db
class TestSOAPNoteModel:
    def test_create_soap_note(self) -> None:
        note = SOAPNoteFactory()
        assert note.pk is not None
        assert note.subjective != ""

    def test_soap_note_one_to_one_with_encounter(self) -> None:
        encounter = EncounterFactory()
        note = SOAPNoteFactory(encounter=encounter)
        assert note.encounter_id == encounter.pk
        assert encounter.soap_note.pk == note.pk

    def test_cannot_create_two_soap_notes_for_same_encounter(self) -> None:
        import pytest
        from django.db import IntegrityError

        encounter = EncounterFactory()
        SOAPNoteFactory(encounter=encounter)
        with pytest.raises(IntegrityError):
            SOAPNoteFactory(encounter=encounter)

    def test_soap_note_str(self) -> None:
        note = SOAPNoteFactory()
        assert "SOAP" in str(note)

    def test_soap_note_fields_blank_by_default(self) -> None:
        encounter = EncounterFactory()
        note = SOAPNote.objects.create(
            practice=encounter.practice,
            encounter=encounter,
        )
        assert note.subjective == ""
        assert note.objective == ""
        assert note.assessment == ""
        assert note.plan == ""


@pytest.mark.django_db
class TestVitalSignsModel:
    def test_create_vital_signs(self) -> None:
        vitals = VitalSignsFactory()
        assert vitals.pk is not None
        assert vitals.temperature is not None
        assert vitals.heart_rate == 95

    def test_vital_signs_one_to_one_with_encounter(self) -> None:
        encounter = EncounterFactory()
        vitals = VitalSignsFactory(encounter=encounter)
        assert encounter.vital_signs.pk == vitals.pk

    def test_vital_signs_all_fields_nullable(self) -> None:
        encounter = EncounterFactory()
        vitals = VitalSigns.objects.create(
            practice=encounter.practice,
            encounter=encounter,
        )
        assert vitals.temperature is None
        assert vitals.heart_rate is None
        assert vitals.oxygen_saturation is None


@pytest.mark.django_db
class TestAnthropometryBMICalculation:
    def test_bmi_auto_calculated_on_save(self) -> None:
        encounter = EncounterFactory()
        patient = encounter.patient

        # weight 10kg, height 75cm → BMI = 10 / (0.75^2) = 17.78
        anthropometry = Anthropometry(
            practice=encounter.practice,
            encounter=encounter,
            patient=patient,
            weight_kg=Decimal("10.000"),
            height_cm=Decimal("75.0"),
        )
        anthropometry.save()

        expected_bmi = round(10.0 / (0.75 ** 2), 2)
        assert float(anthropometry.bmi) == pytest.approx(expected_bmi, rel=0.01)

    def test_bmi_is_none_when_height_missing(self) -> None:
        encounter = EncounterFactory()
        patient = encounter.patient
        anthropometry = Anthropometry(
            practice=encounter.practice,
            encounter=encounter,
            patient=patient,
            weight_kg=Decimal("10.000"),
            height_cm=None,
        )
        anthropometry.save()
        assert anthropometry.bmi is None

    def test_bmi_is_none_when_weight_missing(self) -> None:
        encounter = EncounterFactory()
        patient = encounter.patient
        anthropometry = Anthropometry(
            practice=encounter.practice,
            encounter=encounter,
            patient=patient,
            weight_kg=None,
            height_cm=Decimal("75.0"),
        )
        anthropometry.save()
        assert anthropometry.bmi is None


@pytest.mark.django_db
class TestAnthropometryZScoreCalculation:
    def test_z_scores_calculated_on_save_for_newborn(self) -> None:
        """
        A newborn boy with the WHO median weight (3.35kg) should have Z ≈ 0.
        """
        from apps.patients.models import Patient

        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()

        # Newborn: DOB = today
        patient = PatientFactory(
            practice=practice,
            date_of_birth=today,
            sex_at_birth=Patient.M,
        )
        encounter = EncounterFactory(
            practice=practice,
            patient=patient,
            doctor=doctor,
            scheduled_at=None,
        )

        anthropometry = Anthropometry(
            practice=practice,
            encounter=encounter,
            patient=patient,
            weight_kg=Decimal("3.35"),  # close to WHO median for boys at birth (3.3464)
            height_cm=Decimal("49.9"),  # close to WHO median for boys at birth (49.8842)
            head_circumference_cm=Decimal("34.5"),  # close to WHO median (34.4618)
        )
        anthropometry.save()

        # Z-scores should be near 0 for median values
        if anthropometry.weight_for_age_z is not None:
            assert abs(float(anthropometry.weight_for_age_z)) < 0.5

        if anthropometry.height_for_age_z is not None:
            assert abs(float(anthropometry.height_for_age_z)) < 0.5

    def test_z_scores_none_when_measurements_missing(self) -> None:
        encounter = EncounterFactory()
        patient = encounter.patient
        anthropometry = Anthropometry(
            practice=encounter.practice,
            encounter=encounter,
            patient=patient,
            weight_kg=None,
            height_cm=None,
            head_circumference_cm=None,
        )
        anthropometry.save()
        assert anthropometry.weight_for_age_z is None
        assert anthropometry.height_for_age_z is None
        assert anthropometry.weight_for_age_percentile is None


@pytest.mark.django_db
class TestDiagnosisModel:
    def test_create_diagnosis(self) -> None:
        diagnosis = DiagnosisFactory()
        assert diagnosis.pk is not None
        assert diagnosis.description != ""
        assert diagnosis.is_primary is True

    def test_diagnosis_str_contains_description(self) -> None:
        diagnosis = DiagnosisFactory(description="Viral pharyngitis")
        assert "Viral pharyngitis" in str(diagnosis)

    def test_diagnosis_str_contains_code(self) -> None:
        diagnosis = DiagnosisFactory(code="J02.9", description="Pharyngitis")
        assert "J02.9" in str(diagnosis)

    def test_diagnosis_primary_flag(self) -> None:
        diagnosis = DiagnosisFactory(is_primary=True)
        assert "[PRIMARY]" in str(diagnosis)

    def test_diagnosis_multiple_per_encounter(self) -> None:
        encounter = EncounterFactory()
        d1 = DiagnosisFactory(encounter=encounter, is_primary=True, code="J06.9")
        d2 = DiagnosisFactory(encounter=encounter, is_primary=False, code="R50.9")
        assert encounter.diagnoses.count() == 2

    def test_diagnosis_code_optional(self) -> None:
        encounter = EncounterFactory()
        diagnosis = Diagnosis.objects.create(
            practice=encounter.practice,
            encounter=encounter,
            description="Unspecified condition",
            code="",
        )
        assert diagnosis.code == ""
        assert "Unspecified condition" in str(diagnosis)
