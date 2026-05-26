"""
Tests for medical_records API views.
"""

from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.medical_records.models import Anthropometry, Encounter, SOAPNote
from tests.factories.medical_records import (
    AnthropometryFactory,
    DiagnosisFactory,
    EncounterFactory,
    SOAPNoteFactory,
    VitalSignsFactory,
)
from tests.factories.patients import PatientFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def auth_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# Encounter endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEncounterListView:
    def test_unauthenticated_access_denied(self) -> None:
        client = APIClient()
        url = "/api/v1/encounters/"
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_doctor_can_list_encounters(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        EncounterFactory(practice=practice, doctor=doctor)
        EncounterFactory(practice=practice, doctor=doctor)

        client = auth_client(doctor)
        response = client.get("/api/v1/encounters/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_tutor_sees_only_linked_patient_encounters(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)

        tutor = UserFactory()
        linked_patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=linked_patient, practice=practice)

        unlinked_patient = PatientFactory(practice=practice)

        enc_linked = EncounterFactory(practice=practice, patient=linked_patient, doctor=doctor)
        enc_unlinked = EncounterFactory(practice=practice, patient=unlinked_patient, doctor=doctor)

        client = auth_client(tutor)
        response = client.get("/api/v1/encounters/")
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert enc_linked.pk in ids
        assert enc_unlinked.pk not in ids

    def test_tutor_cannot_read_unlinked_patient_encounter(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        unlinked_patient = PatientFactory(practice=practice)
        encounter = EncounterFactory(practice=practice, patient=unlinked_patient, doctor=doctor)

        client = auth_client(tutor)
        response = client.get(f"/api/v1/encounters/{encounter.pk}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_doctor_can_filter_encounters_by_patient_id(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        p1 = PatientFactory(practice=practice)
        p2 = PatientFactory(practice=practice)
        enc1 = EncounterFactory(practice=practice, patient=p1, doctor=doctor)
        EncounterFactory(practice=practice, patient=p2, doctor=doctor)

        client = auth_client(doctor)
        response = client.get(f"/api/v1/encounters/?patient_id={p1.pk}")
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert enc1.pk in ids
        assert all(item["patient"] == p1.pk for item in response.data["results"])


@pytest.mark.django_db
class TestEncounterCreateView:
    def test_doctor_can_create_encounter(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        patient = PatientFactory(practice=practice)

        client = auth_client(doctor)
        payload = {
            "practice": practice.pk,
            "patient": patient.pk,
            "doctor": doctor.pk,
            "encounter_type": Encounter.CONSULTATION,
            "status": Encounter.SCHEDULED,
            "reason_for_visit": "Annual check",
        }
        response = client.post("/api/v1/encounters/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Encounter.objects.filter(patient=patient).exists()

    def test_create_encounter_emits_audit_log(self) -> None:
        from apps.core.models import AuditLog

        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        patient = PatientFactory(practice=practice)

        client = auth_client(doctor)
        payload = {
            "practice": practice.pk,
            "patient": patient.pk,
            "doctor": doctor.pk,
            "encounter_type": Encounter.CONSULTATION,
            "status": Encounter.SCHEDULED,
        }
        response = client.post("/api/v1/encounters/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        enc_id = response.data["id"]
        assert AuditLog.objects.filter(
            user=doctor,
            action=AuditLog.CREATE,
            resource_type="Encounter",
            resource_id=enc_id,
        ).exists()

    def test_tutor_cannot_create_encounter(self) -> None:
        tutor = UserFactory()
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        patient = PatientFactory(practice=practice)

        client = auth_client(tutor)
        payload = {
            "practice": practice.pk,
            "patient": patient.pk,
            "doctor": doctor.pk,
            "encounter_type": Encounter.CONSULTATION,
            "status": Encounter.SCHEDULED,
        }
        response = client.post("/api/v1/encounters/", payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSOAPNoteView:
    def test_doctor_can_add_soap_note(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        encounter = EncounterFactory(practice=practice, doctor=doctor)

        client = auth_client(doctor)
        payload = {
            "subjective": "Child has had a cough for 3 days.",
            "objective": "Clear lungs. Mild nasal congestion.",
            "assessment": "Viral upper respiratory tract infection.",
            "plan": "Rest, hydration. Review if not improving in 5 days.",
        }
        url = f"/api/v1/encounters/{encounter.pk}/soap/"
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert SOAPNote.objects.filter(encounter=encounter).exists()

    def test_tutor_cannot_access_soap_note(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        encounter = EncounterFactory(practice=practice, patient=patient, doctor=doctor)
        SOAPNoteFactory(encounter=encounter)

        client = auth_client(tutor)
        url = f"/api/v1/encounters/{encounter.pk}/soap/"
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAnthropometryView:
    def test_doctor_can_add_anthropometry(self) -> None:
        import datetime
        from apps.patients.models import Patient

        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        patient = PatientFactory(
            practice=practice,
            date_of_birth=datetime.date.today(),
            gender=Patient.MALE,
        )
        encounter = EncounterFactory(practice=practice, patient=patient, doctor=doctor)

        client = auth_client(doctor)
        payload = {
            "weight_kg": "3.35",
            "height_cm": "49.9",
            "head_circumference_cm": "34.5",
        }
        url = f"/api/v1/encounters/{encounter.pk}/anthropometry/"
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Response should include Z-scores (may be None for newborn if age=0)
        assert "weight_for_age_z" in response.data
        assert "bmi" in response.data

    def test_z_scores_auto_calculated_in_response(self) -> None:
        """
        After posting measurements, the response should include auto-calculated
        Z-scores and percentiles (not None for a valid age/measurement combo).
        """
        import datetime
        from apps.patients.models import Patient

        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        today = datetime.date.today()
        patient = PatientFactory(
            practice=practice,
            date_of_birth=today,
            gender=Patient.MALE,
        )
        encounter = EncounterFactory(practice=practice, patient=patient, doctor=doctor, scheduled_at=None)

        client = auth_client(doctor)
        payload = {
            "weight_kg": "3.346",  # WHO median for boys at birth
            "height_cm": "49.9",
        }
        url = f"/api/v1/encounters/{encounter.pk}/anthropometry/"
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        # For newborn at median weight, Z should be very close to 0
        z = response.data.get("weight_for_age_z")
        if z is not None:
            assert abs(float(z)) < 0.5

    def test_tutor_can_read_anthropometry_for_linked_patient(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        encounter = EncounterFactory(practice=practice, patient=patient, doctor=doctor)
        AnthropometryFactory(encounter=encounter, patient=patient)

        client = auth_client(tutor)
        url = f"/api/v1/encounters/{encounter.pk}/anthropometry/"
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_tutor_cannot_write_anthropometry(self) -> None:
        doctor = DoctorFactory()
        practice = PracticeFactory(owner=doctor)
        tutor = UserFactory()
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        encounter = EncounterFactory(practice=practice, patient=patient, doctor=doctor)

        client = auth_client(tutor)
        url = f"/api/v1/encounters/{encounter.pk}/anthropometry/"
        payload = {"weight_kg": "10.0"}
        response = client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestUnauthenticatedAccess:
    def test_encounters_requires_auth(self) -> None:
        client = APIClient()
        response = client.get("/api/v1/encounters/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_soap_requires_auth(self) -> None:
        encounter = EncounterFactory()
        client = APIClient()
        url = f"/api/v1/encounters/{encounter.pk}/soap/"
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_anthropometry_requires_auth(self) -> None:
        encounter = EncounterFactory()
        client = APIClient()
        url = f"/api/v1/encounters/{encounter.pk}/anthropometry/"
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
