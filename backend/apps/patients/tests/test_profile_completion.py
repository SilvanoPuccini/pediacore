"""
Unit and serializer-level tests for patient profile completion.

TDD RED phase: all tests reference compute_patient_completion and
profile_completion field which do NOT exist yet — expected to fail with
ImportError / AttributeError.
"""

from __future__ import annotations

from datetime import date

import pytest

from apps.patients.models import Patient


# ---------------------------------------------------------------------------
# Helpers — build unsaved Patient instances to keep unit tests DB-free
# ---------------------------------------------------------------------------

def _make_patient(**kwargs) -> Patient:
    """Return an unsaved Patient instance with sensible defaults for testing."""
    defaults = {
        "first_name": "Sofía",
        "last_name": "Martínez",
        "date_of_birth": date(2020, 6, 15),
        "sex_at_birth": Patient.F,
        "insurance": Patient.FONASA_B,
    }
    defaults.update(kwargs)
    patient = Patient(**defaults)
    return patient


# ---------------------------------------------------------------------------
# Unit tests — compute_patient_completion (no DB, pure function)
# ---------------------------------------------------------------------------


class TestComputePatientCompletion:
    """Unit tests for compute_patient_completion pure service function."""

    def test_all_five_fields_filled_returns_100(self) -> None:
        """All five fields present and valid → 100% with empty missing list."""
        from apps.patients.services.profile_completion import compute_patient_completion

        patient = _make_patient(
            first_name="Sofía",
            last_name="Martínez",
            date_of_birth=date(2020, 6, 15),
            sex_at_birth=Patient.F,
            insurance=Patient.FONASA_B,
        )
        result = compute_patient_completion(patient)

        assert result["percentage"] == 100
        assert result["missing"] == []

    def test_only_required_fields_returns_60(self) -> None:
        """Name + DOB filled, both enrichment fields missing → 60%."""
        from apps.patients.services.profile_completion import compute_patient_completion

        patient = _make_patient(
            first_name="Sofía",
            last_name="Martínez",
            date_of_birth=date(2020, 6, 15),
            sex_at_birth=Patient.NO_ESPECIFICA,
            insurance="",
        )
        result = compute_patient_completion(patient)

        assert result["percentage"] == 60
        assert set(result["missing"]) == {"sex_at_birth", "insurance"}

    def test_sex_at_birth_no_especifica_returns_80(self) -> None:
        """Insurance filled but sex=NO_ESPECIFICA → 80% with sex_at_birth in missing."""
        from apps.patients.services.profile_completion import compute_patient_completion

        patient = _make_patient(
            sex_at_birth=Patient.NO_ESPECIFICA,
            insurance=Patient.PARTICULAR,
        )
        result = compute_patient_completion(patient)

        assert result["percentage"] == 80
        assert "sex_at_birth" in result["missing"]
        assert "insurance" not in result["missing"]

    def test_insurance_blank_returns_80(self) -> None:
        """sex_at_birth valid but insurance blank → 80% with insurance in missing."""
        from apps.patients.services.profile_completion import compute_patient_completion

        patient = _make_patient(
            sex_at_birth=Patient.M,
            insurance="",
        )
        result = compute_patient_completion(patient)

        assert result["percentage"] == 80
        assert "insurance" in result["missing"]
        assert "sex_at_birth" not in result["missing"]

    def test_sex_at_birth_male_counts_as_filled(self) -> None:
        """sex_at_birth=M (not NO_ESPECIFICA) must count as filled."""
        from apps.patients.services.profile_completion import compute_patient_completion

        patient = _make_patient(
            sex_at_birth=Patient.M,
            insurance=Patient.FONASA_A,
        )
        result = compute_patient_completion(patient)

        assert result["percentage"] == 100
        assert "sex_at_birth" not in result["missing"]


# ---------------------------------------------------------------------------
# Serializer integration tests — profile_completion key in PatientSerializer
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPatientSerializerProfileCompletion:
    """Integration tests: profile_completion field wired into PatientSerializer."""

    def test_profile_completion_key_present_in_serializer_output(self, db) -> None:
        """PatientSerializer.data must include 'profile_completion' key."""
        from apps.patients.serializers import PatientSerializer
        from tests.factories.patients import PatientFactory

        patient = PatientFactory(
            sex_at_birth=Patient.F,
            insurance=Patient.FONASA_B,
        )
        data = PatientSerializer(patient).data

        assert "profile_completion" in data
        assert isinstance(data["profile_completion"]["percentage"], int)
        assert isinstance(data["profile_completion"]["missing"], list)

    def test_newly_created_patient_shows_60_percent(self, db) -> None:
        """Patient with only required fields (name + DOB) must return percentage=60."""
        from apps.patients.serializers import PatientSerializer
        from tests.factories.patients import PatientFactory

        patient = PatientFactory(
            sex_at_birth=Patient.NO_ESPECIFICA,
            insurance="",
        )
        data = PatientSerializer(patient).data

        assert data["profile_completion"]["percentage"] == 60
        assert "sex_at_birth" in data["profile_completion"]["missing"]
        assert "insurance" in data["profile_completion"]["missing"]
