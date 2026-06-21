"""
Serializers for the patients app.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.patients.models import CoResponsible, Patient, PatientFile, TutorPatient

User = get_user_model()


# ---------------------------------------------------------------------------
# TutorPatient serializers
# ---------------------------------------------------------------------------


class TutorPatientSerializer(serializers.ModelSerializer):
    """Read serializer showing tutor info and relationship details."""

    tutor_email = serializers.EmailField(source="tutor.email", read_only=True)
    tutor_full_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_phone = serializers.CharField(source="tutor.phone", read_only=True, default="")
    tutor_avatar_url = serializers.SerializerMethodField()

    def get_tutor_avatar_url(self, obj: TutorPatient) -> str | None:
        if obj.tutor and obj.tutor.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.tutor.avatar.url)
            return obj.tutor.avatar.url
        return None

    class Meta:
        model = TutorPatient
        fields = [
            "id",
            "tutor",
            "tutor_email",
            "tutor_full_name",
            "tutor_phone",
            "tutor_avatar_url",
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
    profile_completion = serializers.SerializerMethodField()
    last_encounter_date = serializers.DateTimeField(read_only=True, default=None)
    next_appointment_date = serializers.DateField(read_only=True, default=None)

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
            "sex_at_birth",
            "document_type",
            "insurance",
            "rut",
            "blood_type",
            "allergies",
            "chronic_conditions",
            "notes",
            "photo",
            "country",
            "region",
            "comuna",
            "address",
            "phone",
            "phone_prefix",
            "preferred_location",
            "is_active",
            "birth_weight_grams",
            "birth_length_cm",
            "gestational_weeks",
            "birth_type",
            "apgar_1min",
            "apgar_5min",
            "feeding_type",
            "school_name",
            "grade",
            "tutors",
            "created_at",
            "updated_at",
            "profile_completion",
            "last_encounter_date",
            "next_appointment_date",
        ]
        read_only_fields = [
            "id", "full_name", "age", "created_at", "updated_at",
            "profile_completion", "last_encounter_date", "next_appointment_date",
        ]

    def get_profile_completion(self, obj: Patient) -> dict:
        from apps.patients.services.profile_completion import compute_patient_completion

        return compute_patient_completion(obj)


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
            "sex_at_birth",
            "document_type",
            "insurance",
            "rut",
            "blood_type",
            "allergies",
            "chronic_conditions",
            "notes",
            "photo",
            "country",
            "region",
            "comuna",
            "address",
            "phone",
            "is_active",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "insurance": {"required": False, "default": ""},
            "sex_at_birth": {"required": False},
            "document_type": {"required": False},
            "country": {"required": False},
            "rut": {"required": True},
            "blood_type": {"required": False},
            "region": {"required": False},
            "comuna": {"required": False},
            "address": {"required": False},
            "phone": {"required": False},
            "photo": {"required": False},
            "allergies": {"required": False},
            "chronic_conditions": {"required": False},
            "notes": {"required": False},
            "is_active": {"required": False},
        }

    def validate(self, attrs: dict) -> dict:
        """Validate RUT format when document_type is RUT."""
        from apps.core.validators import validate_rut as _validate_rut
        from django.core.exceptions import ValidationError as DjangoValidationError

        document_type = attrs.get("document_type", "RUT")
        rut = attrs.get("rut")
        if document_type == "RUT" and rut:
            try:
                cleaned = _validate_rut(rut)
                attrs["rut"] = cleaned
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"rut": exc.messages})
        return attrs


class TutorPatientRelationUpdateSerializer(serializers.ModelSerializer):
    """Update the tutor's relationship to a patient."""

    class Meta:
        model = TutorPatient
        fields = ["relationship"]

    def validate_relationship(self, value: str) -> str:
        valid = dict(TutorPatient.RELATIONSHIP_CHOICES)
        if value not in valid:
            raise serializers.ValidationError(
                f"'{value}' is not a valid relationship. Choices: {', '.join(valid)}"
            )
        return value


class TutorPatientUpdateSerializer(serializers.ModelSerializer):
    """
    Partial update serializer restricted to fields a TUTOR is allowed to edit.

    Tutors may update contact/address/insurance data only.
    Identity fields (name, DOB, sex, document, RUT, blood type, clinical notes,
    photo, practice) are read-only for tutors.
    """

    class Meta:
        model = Patient
        fields = [
            "insurance",
            "country",
            "region",
            "comuna",
            "address",
            "phone",
            "phone_prefix",
        ]


class CoResponsibleSerializer(serializers.ModelSerializer):
    """CRUD serializer for co-responsible adults linked to a tutor."""

    relationship_display = serializers.CharField(
        source="get_relationship_display", read_only=True
    )

    class Meta:
        model = CoResponsible
        fields = [
            "id",
            "name",
            "relationship",
            "relationship_display",
            "rut",
            "phone",
            "email",
            "can_book",
            "can_pickup",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PatientUpdateSerializer(serializers.ModelSerializer):
    """Partial update serializer for patient records."""

    class Meta:
        model = Patient
        fields = [
            "first_name",
            "last_name",
            "date_of_birth",
            "sex_at_birth",
            "document_type",
            "insurance",
            "rut",
            "blood_type",
            "allergies",
            "chronic_conditions",
            "notes",
            "photo",
            "country",
            "region",
            "comuna",
            "address",
            "phone",
            "preferred_location",
            "is_active",
            "birth_weight_grams",
            "birth_length_cm",
            "gestational_weeks",
            "birth_type",
            "apgar_1min",
            "apgar_5min",
            "feeding_type",
            "school_name",
            "grade",
        ]

    def validate(self, attrs: dict) -> dict:
        """Validate RUT format when document_type is RUT."""
        from apps.core.validators import validate_rut as _validate_rut
        from django.core.exceptions import ValidationError as DjangoValidationError

        document_type = attrs.get("document_type", "RUT")
        rut = attrs.get("rut")
        if document_type == "RUT" and rut:
            try:
                cleaned = _validate_rut(rut)
                attrs["rut"] = cleaned
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"rut": exc.messages})
        return attrs
