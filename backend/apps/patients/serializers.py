"""
Serializers for the patients app.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.patients.models import Patient, PatientFile, TutorPatient

User = get_user_model()


# ---------------------------------------------------------------------------
# TutorPatient serializers
# ---------------------------------------------------------------------------


class TutorPatientSerializer(serializers.ModelSerializer):
    """Read serializer showing tutor info and relationship details."""

    tutor_email = serializers.EmailField(source="tutor.email", read_only=True)
    tutor_full_name = serializers.CharField(source="tutor.full_name", read_only=True)

    class Meta:
        model = TutorPatient
        fields = [
            "id",
            "tutor",
            "tutor_email",
            "tutor_full_name",
            "relationship",
            "is_primary",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class TutorPatientCreateSerializer(serializers.ModelSerializer):
    """Create a tutor-patient link. patient_id comes from the URL kwarg."""

    class Meta:
        model = TutorPatient
        fields = ["id", "practice", "tutor", "patient", "relationship", "is_primary"]
        read_only_fields = ["id"]

    def validate(self, attrs: dict) -> dict:
        tutor = attrs.get("tutor")
        if tutor and tutor.role != User.TUTOR:
            raise serializers.ValidationError(
                {"tutor": "Only users with the TUTOR role can be linked to a patient."}
            )
        return attrs


# ---------------------------------------------------------------------------
# PatientFile serializers
# ---------------------------------------------------------------------------


class PatientFileSerializer(serializers.ModelSerializer):
    """Read serializer for patient files."""

    uploaded_by_email = serializers.EmailField(source="uploaded_by.email", read_only=True)

    class Meta:
        model = PatientFile
        fields = [
            "id",
            "patient",
            "uploaded_by",
            "uploaded_by_email",
            "file",
            "original_filename",
            "file_type",
            "description",
            "file_size",
            "created_at",
        ]
        read_only_fields = ["id", "uploaded_by", "original_filename", "file_size", "created_at"]


class PatientFileUploadSerializer(serializers.ModelSerializer):
    """
    Upload a file for a patient.

    original_filename and file_size are auto-captured from the uploaded file object;
    the client does not need to send them explicitly.
    """

    class Meta:
        model = PatientFile
        fields = [
            "id",
            "practice",
            "patient",
            "file",
            "file_type",
            "description",
            "original_filename",
            "file_size",
        ]
        read_only_fields = ["id", "practice", "patient", "original_filename", "file_size"]

    def validate_file(self, value) -> object:
        """Capture filename and size from the InMemoryUploadedFile."""
        # Store on the instance for use in create()
        self._uploaded_file = value
        return value

    def create(self, validated_data: dict) -> PatientFile:
        uploaded = getattr(self, "_uploaded_file", validated_data.get("file"))
        validated_data["original_filename"] = getattr(uploaded, "name", "")[:255]
        validated_data["file_size"] = getattr(uploaded, "size", 0)
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Patient serializers
# ---------------------------------------------------------------------------


class PatientSerializer(serializers.ModelSerializer):
    """Full read serializer including computed fields and nested tutor list."""

    full_name = serializers.CharField(read_only=True)
    age = serializers.DictField(read_only=True)
    tutors = TutorPatientSerializer(source="tutor_patients", many=True, read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "practice",
            "first_name",
            "last_name",
            "full_name",
            "date_of_birth",
            "age",
            "gender",
            "rut",
            "blood_type",
            "allergies",
            "chronic_conditions",
            "notes",
            "photo",
            "is_active",
            "tutors",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "full_name", "age", "created_at", "updated_at"]


class PatientCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new patient.

    Both doctors and tutors can use this. When a tutor creates a patient,
    the view automatically creates the TutorPatient link.
    """

    class Meta:
        model = Patient
        fields = [
            "id",
            "practice",
            "first_name",
            "last_name",
            "date_of_birth",
            "gender",
            "rut",
            "blood_type",
            "allergies",
            "chronic_conditions",
            "notes",
            "photo",
            "is_active",
        ]
        read_only_fields = ["id"]


class PatientUpdateSerializer(serializers.ModelSerializer):
    """Partial update serializer for patient records."""

    class Meta:
        model = Patient
        fields = [
            "first_name",
            "last_name",
            "date_of_birth",
            "gender",
            "rut",
            "blood_type",
            "allergies",
            "chronic_conditions",
            "notes",
            "photo",
            "is_active",
        ]
