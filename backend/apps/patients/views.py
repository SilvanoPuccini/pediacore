"""
Views for the patients app.

Role-based access:
- DOCTOR  → full access to all patients and files in the practice
- TUTOR   → access limited to their own linked patients
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.core.models import AuditLog
from apps.core.permissions import IsDoctor, IsTutor
from apps.patients.models import Patient, PatientFile, TutorPatient
from apps.patients.serializers import (
    PatientCreateSerializer,
    PatientFileSerializer,
    PatientFileUploadSerializer,
    PatientSerializer,
    PatientUpdateSerializer,
    TutorPatientCreateSerializer,
    TutorPatientSerializer,
)

User = get_user_model()


class PatientViewSet(ModelViewSet):
    """
    CRUD for Patient records.

    - Doctor: sees all patients for the practice, can create/update/delete freely.
    - Tutor: sees only their linked patients, can create (auto-linked on creation).
    """

    def get_permissions(self) -> list:
        if self.action in ("list", "retrieve", "create"):
            return [IsAuthenticated()]
        if self.action == "destroy":
            # Tutors unlink; doctors hard-delete
            return [IsAuthenticated()]
        # update / partial_update → doctor only
        return [IsDoctor()]

    def perform_destroy(self, instance: Patient) -> None:
        user = self.request.user
        if user.role == User.TUTOR:
            # Tutor only unlinks — patient record stays for the doctor
            link = instance.tutor_patients.filter(tutor=user).first()
            if not link:
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied("No tenés permiso para eliminar este paciente.")
            link.delete()
            return
        # Doctor: hard delete
        instance.delete()

    def get_serializer_class(self):
        if self.action == "create":
            return PatientCreateSerializer
        if self.action in ("update", "partial_update"):
            return PatientUpdateSerializer
        return PatientSerializer

    def get_queryset(self) -> QuerySet[Patient]:
        user = self.request.user
        qs = Patient.objects.select_related("practice").prefetch_related(
            "tutor_patients__tutor",
            "files",
        )
        if user.role == User.DOCTOR:
            return qs
        if user.role == User.TUTOR:
            return qs.filter(
                tutor_patients__tutor=user,
                tutor_patients__deleted_at__isnull=True,
            )
        return qs.none()

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ── Auto-dedup: same name + DOB in the same practice → reuse ─────
        existing = Patient.objects.filter(
            practice=data["practice"],
            first_name__iexact=data["first_name"].strip(),
            last_name__iexact=data["last_name"].strip(),
            date_of_birth=data["date_of_birth"],
        ).first()

        if existing and request.user.role == User.TUTOR:
            # Link the tutor to the existing patient (idempotent)
            TutorPatient.objects.get_or_create(
                tutor=request.user,
                patient=existing,
                defaults={
                    "practice": existing.practice,
                    "relationship": TutorPatient.OTHER,
                    "is_primary": True,
                },
            )
            return Response(
                PatientSerializer(existing).data,
                status=status.HTTP_201_CREATED,
            )

        patient = serializer.save()

        # Auto-link the creating tutor to the new patient
        if request.user.role == User.TUTOR:
            TutorPatient.objects.create(
                practice=patient.practice,
                tutor=request.user,
                patient=patient,
                relationship=TutorPatient.OTHER,
                is_primary=True,
            )

        headers = self.get_success_headers(serializer.data)
        return Response(
            PatientSerializer(patient).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


class TutorPatientViewSet(ModelViewSet):
    """
    Manage tutor-patient links for a given patient (nested under /patients/<id>/tutors/).

    - Doctor: full access (create, read, delete).
    - Tutor: read-only for their own linked patients.
    """

    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self) -> list:
        if self.action in ("create", "destroy"):
            return [IsDoctor()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return TutorPatientCreateSerializer
        return TutorPatientSerializer

    def get_queryset(self) -> QuerySet[TutorPatient]:
        patient_pk = self.kwargs.get("patient_pk")
        user = self.request.user
        qs = TutorPatient.objects.select_related("tutor", "patient").filter(
            patient_id=patient_pk
        )
        if user.role == User.TUTOR:
            # Tutor may only see links for patients they are already linked to
            qs = qs.filter(patient__tutor_patients__tutor=user)
        return qs

    def perform_create(self, serializer: TutorPatientCreateSerializer) -> None:
        patient_pk = self.kwargs.get("patient_pk")
        patient = Patient.objects.get(pk=patient_pk)
        serializer.save(patient=patient, practice=patient.practice)


class PatientFileViewSet(ModelViewSet):
    """
    Upload and manage files for a given patient (nested under /patients/<id>/files/).

    - Doctor: full access to all files.
    - Tutor: read-only for their linked patients' files.

    File access is audit-logged via AuditLog.
    """

    parser_classes = [MultiPartParser, FormParser]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self) -> list:
        if self.action == "create":
            return [IsAuthenticated()]
        if self.action == "destroy":
            return [IsDoctor()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return PatientFileUploadSerializer
        return PatientFileSerializer

    def get_queryset(self) -> QuerySet[PatientFile]:
        patient_pk = self.kwargs.get("patient_pk")
        user = self.request.user
        qs = PatientFile.objects.select_related("patient", "uploaded_by").filter(
            patient_id=patient_pk
        )
        if user.role == User.TUTOR:
            qs = qs.filter(patient__tutor_patients__tutor=user)
        return qs

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        """Log file access for audit trail."""
        instance = self.get_object()
        AuditLog.log(
            user=request.user,
            action=AuditLog.VIEW,
            resource_type="PatientFile",
            resource_id=instance.pk,
            request=request,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def list(self, request: Request, *args, **kwargs) -> Response:
        """Log bulk file listing for audit trail."""
        patient_pk = self.kwargs.get("patient_pk")
        AuditLog.log(
            user=request.user,
            action=AuditLog.VIEW,
            resource_type="PatientFile",
            resource_id=int(patient_pk),
            request=request,
            metadata={"action_detail": "list_files"},
        )
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer: PatientFileUploadSerializer) -> None:
        patient_pk = self.kwargs.get("patient_pk")
        patient = Patient.objects.get(pk=patient_pk)
        serializer.save(
            patient=patient,
            practice=patient.practice,
            uploaded_by=self.request.user,
        )
