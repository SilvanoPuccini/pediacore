"""
Integration tests for patients app views.
"""

from __future__ import annotations

import io
from datetime import date

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.patients.models import Patient, TutorPatient
from tests.factories.patients import PatientFactory, PatientFileFactory, TutorPatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory, UserFactory


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def doctor(db):
    return DoctorFactory()


@pytest.fixture
def tutor(db):
    return UserFactory()


@pytest.fixture
def practice(db, doctor):
    return PracticeFactory(owner=doctor)


@pytest.fixture
def doctor_client(api_client, doctor) -> APIClient:
    api_client.force_authenticate(user=doctor)
    return api_client


@pytest.fixture
def tutor_client(api_client, tutor) -> APIClient:
    api_client.force_authenticate(user=tutor)
    return api_client


# ---------------------------------------------------------------------------
# Patient list / retrieve
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPatientList:
    def test_doctor_can_list_all_patients(self, doctor_client, practice) -> None:
        PatientFactory.create_batch(3, practice=practice)
        url = "/api/v1/patients/"
        response = doctor_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 3

    def test_tutor_sees_only_linked_patients(self, tutor_client, tutor, practice) -> None:
        linked_patient = PatientFactory(practice=practice)
        unlinked_patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=linked_patient, practice=practice)

        url = "/api/v1/patients/"
        response = tutor_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        ids = [p["id"] for p in response.data["results"]]
        assert linked_patient.pk in ids
        assert unlinked_patient.pk not in ids

    def test_unauthenticated_access_denied(self, api_client) -> None:
        response = api_client.get("/api/v1/patients/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# Patient create
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPatientCreate:
    def _payload(self, practice) -> dict:
        return {
            "practice": practice.pk,
            "first_name": "Lucas",
            "last_name": "Torres",
            "date_of_birth": "2022-03-10",
            "sex_at_birth": "M",
        }

    def test_doctor_can_create_patient(self, doctor_client, practice) -> None:
        response = doctor_client.post("/api/v1/patients/", data=self._payload(practice))
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["first_name"] == "Lucas"

    def test_tutor_can_create_patient_and_gets_auto_linked(
        self, tutor_client, tutor, practice
    ) -> None:
        response = tutor_client.post("/api/v1/patients/", data=self._payload(practice))
        assert response.status_code == status.HTTP_201_CREATED
        patient_id = response.data["id"]
        assert TutorPatient.objects.filter(tutor=tutor, patient_id=patient_id).exists()

    def test_unauthenticated_cannot_create(self, api_client, practice) -> None:
        response = api_client.post("/api/v1/patients/", data=self._payload(practice))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ---------------------------------------------------------------------------
# TutorPatient create / delete
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTutorPatientViewSet:
    def test_doctor_can_link_tutor_to_patient(self, doctor_client, doctor, tutor, practice) -> None:
        patient = PatientFactory(practice=practice)
        url = f"/api/v1/patients/{patient.pk}/tutors/"
        payload = {
            "practice": practice.pk,
            "tutor": tutor.pk,
            "patient": patient.pk,
            "relationship": "MOTHER",
        }
        response = doctor_client.post(url, data=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert TutorPatient.objects.filter(tutor=tutor, patient=patient).exists()

    def test_tutor_cannot_link_other_tutors(self, tutor_client, tutor, practice) -> None:
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        another_tutor = UserFactory()
        url = f"/api/v1/patients/{patient.pk}/tutors/"
        payload = {
            "practice": practice.pk,
            "tutor": another_tutor.pk,
            "patient": patient.pk,
            "relationship": "FATHER",
        }
        response = tutor_client.post(url, data=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_doctor_can_delete_tutor_link(self, doctor_client, doctor, tutor, practice) -> None:
        patient = PatientFactory(practice=practice)
        link = TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        url = f"/api/v1/patients/{patient.pk}/tutors/{link.pk}/"
        response = doctor_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not TutorPatient.objects.filter(pk=link.pk).exists()


# ---------------------------------------------------------------------------
# PatientFile
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPatientFileViewSet:
    def _make_file(self, name: str = "test.pdf", content: bytes = b"pdf content") -> io.BytesIO:
        f = io.BytesIO(content)
        f.name = name
        return f

    def test_doctor_can_upload_file(self, doctor_client, practice) -> None:
        patient = PatientFactory(practice=practice)
        url = f"/api/v1/patients/{patient.pk}/files/"
        payload = {
            "file_type": "LAB_RESULT",
            "file": self._make_file(),
        }
        response = doctor_client.post(url, data=payload, format="multipart")
        assert response.status_code == status.HTTP_201_CREATED

    def test_file_upload_sets_original_filename_and_size(self, doctor_client, practice) -> None:
        patient = PatientFactory(practice=practice)
        url = f"/api/v1/patients/{patient.pk}/files/"
        content = b"test file content"
        payload = {
            "file_type": "IMAGE",
            "file": self._make_file("foto.jpg", content),
        }
        response = doctor_client.post(url, data=payload, format="multipart")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["original_filename"] == "foto.jpg"
        assert response.data["file_size"] == len(content)

    def test_unauthenticated_cannot_access_files(self, api_client, practice) -> None:
        patient = PatientFactory(practice=practice)
        url = f"/api/v1/patients/{patient.pk}/files/"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tutor_sees_files_for_linked_patient(self, tutor_client, tutor, practice) -> None:
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        doctor = DoctorFactory()
        PatientFileFactory(patient=patient, practice=practice, uploaded_by=doctor)

        url = f"/api/v1/patients/{patient.pk}/files/"
        response = tutor_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_tutor_cannot_delete_file(self, tutor_client, tutor, practice) -> None:
        patient = PatientFactory(practice=practice)
        TutorPatientFactory(tutor=tutor, patient=patient, practice=practice)
        doctor = DoctorFactory()
        pf = PatientFileFactory(patient=patient, practice=practice, uploaded_by=doctor)
        url = f"/api/v1/patients/{patient.pk}/files/{pf.pk}/"
        response = tutor_client.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
