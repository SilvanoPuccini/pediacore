import datetime

import factory

from apps.medical_records.models import (
    Anthropometry,
    Diagnosis,
    Encounter,
    PhysicalExam,
    SOAPNote,
    VitalSigns,
)
from tests.factories.patients import PatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory


class EncounterFactory(factory.django.DjangoModelFactory):
    """Factory for creating Encounter instances in tests."""

    class Meta:
        model = Encounter

    practice = factory.SubFactory(PracticeFactory)
    patient = factory.SubFactory(PatientFactory, practice=factory.SelfAttribute("..practice"))
    doctor = factory.SubFactory(DoctorFactory)
    location = None
    encounter_type = Encounter.CONSULTATION
    status = Encounter.SCHEDULED
    scheduled_at = factory.LazyFunction(
        lambda: datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(days=1)
    )
    started_at = None
    completed_at = None
    reason_for_visit = "Routine check-up"


class SOAPNoteFactory(factory.django.DjangoModelFactory):
    """Factory for creating SOAPNote instances in tests."""

    class Meta:
        model = SOAPNote

    practice = factory.LazyAttribute(lambda obj: obj.encounter.practice)
    encounter = factory.SubFactory(EncounterFactory)
    subjective = "Patient presents with mild fever and cough."
    objective = "T: 38.1°C. Pharyngeal erythema. No adenopathy."
    assessment = "Acute pharyngitis, likely viral."
    plan = "Rest, hydration, paracetamol if T > 38.5°C. Review in 48h if no improvement."


class PhysicalExamFactory(factory.django.DjangoModelFactory):
    """Factory for creating PhysicalExam instances in tests."""

    class Meta:
        model = PhysicalExam

    practice = factory.LazyAttribute(lambda obj: obj.encounter.practice)
    encounter = factory.SubFactory(EncounterFactory)
    general_appearance = "Active, alert, well-nourished."
    skin = "Normal. No rashes."
    head_neck = "Normocephalic."
    eyes = "PERRL. Conjunctivae clear."
    ears_nose_throat = "TMs intact. Mild pharyngeal erythema."
    respiratory = "Clear to auscultation bilaterally."
    cardiovascular = "Regular rate and rhythm. No murmurs."
    abdomen = "Soft, non-tender. No organomegaly."
    genitourinary = ""
    musculoskeletal = "Normal tone and range of motion."
    neurological = "Alert. Normal reflexes."
    lymph_nodes = "No lymphadenopathy."
    additional_findings = ""


class VitalSignsFactory(factory.django.DjangoModelFactory):
    """Factory for creating VitalSigns instances in tests."""

    class Meta:
        model = VitalSigns

    practice = factory.LazyAttribute(lambda obj: obj.encounter.practice)
    encounter = factory.SubFactory(EncounterFactory)
    temperature = "37.2"
    heart_rate = 95
    respiratory_rate = 24
    blood_pressure_systolic = 95
    blood_pressure_diastolic = 60
    oxygen_saturation = "98.5"


class AnthropometryFactory(factory.django.DjangoModelFactory):
    """
    Factory for creating Anthropometry instances in tests.

    Bypasses save() to avoid Z-score calculation against missing DB relations.
    Use create() in tests that need real Z-scores (requires full encounter + patient).
    """

    class Meta:
        model = Anthropometry

    practice = factory.LazyAttribute(lambda obj: obj.encounter.practice)
    encounter = factory.SubFactory(EncounterFactory)
    patient = factory.LazyAttribute(lambda obj: obj.encounter.patient)
    weight_kg = "10.500"
    height_cm = "78.0"
    head_circumference_cm = "46.5"
    bmi = None
    weight_for_age_z = None
    height_for_age_z = None
    head_circumference_for_age_z = None
    bmi_for_age_z = None
    weight_for_height_z = None
    weight_for_age_percentile = None
    height_for_age_percentile = None
    head_circumference_for_age_percentile = None
    bmi_for_age_percentile = None
    weight_for_height_percentile = None


class DiagnosisFactory(factory.django.DjangoModelFactory):
    """Factory for creating Diagnosis instances in tests."""

    class Meta:
        model = Diagnosis

    practice = factory.LazyAttribute(lambda obj: obj.encounter.practice)
    encounter = factory.SubFactory(EncounterFactory)
    code = "J06.9"
    description = "Acute upper respiratory infection, unspecified"
    is_primary = True
    notes = ""
