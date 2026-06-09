"""
Views for the patients app.

Role-based access:
- DOCTOR  → full access to all patients and files in the practice
- TUTOR   → access limited to their own linked patients
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.core.models import AuditLog
from apps.core.permissions import IsDoctor, IsTutor
from apps.patients.models import CoResponsible, Patient, PatientFile, TutorPatient
from apps.patients.serializers import (
    CoResponsibleSerializer,
    PatientCreateSerializer,
    PatientFileSerializer,
    PatientFileUploadSerializer,
    PatientSerializer,
    PatientUpdateSerializer,
    TutorPatientCreateSerializer,
    TutorPatientRelationUpdateSerializer,
    TutorPatientSerializer,
    TutorPatientUpdateSerializer,
)

User = get_user_model()


class PatientViewSet(ModelViewSet):
    """
    CRUD for Patient records.

    - Doctor: sees all patients for the practice, can create/update/delete freely.
    - Tutor: sees only their linked patients, can create (auto-linked on creation).
    """

    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["first_name", "last_name", "rut"]
    ordering_fields = ["first_name", "last_name", "date_of_birth", "created_at"]
    ordering = ["last_name", "first_name"]

    def get_permissions(self) -> list:
        if self.action in ("list", "retrieve", "create"):
            return [IsAuthenticated()]
        if self.action == "destroy":
            # Tutors unlink; doctors hard-delete
            return [IsAuthenticated()]
        if self.action == "partial_update":
            # Tutors may patch their own patients (restricted fields via serializer)
            return [IsAuthenticated()]
        # update (full PUT) → doctor only
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
        if self.action == "update":
            return PatientUpdateSerializer
        if self.action == "partial_update":
            user = self.request.user
            if user.role == User.TUTOR:
                return TutorPatientUpdateSerializer
            return PatientUpdateSerializer
        return PatientSerializer

    def partial_update(self, request: Request, *args, **kwargs) -> Response:
        """
        PATCH a patient record.

        - TUTOR: restricted to allowed fields; ownership is verified explicitly
          (the queryset already filters, but we add an extra guard for safety).
        - DOCTOR: full field access via PatientUpdateSerializer.
        """
        instance = self.get_object()

        if request.user.role == User.TUTOR:
            linked = TutorPatient.objects.filter(
                tutor=request.user,
                patient=instance,
                deleted_at__isnull=True,
            ).exists()
            if not linked:
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    "No tenés permiso para editar este paciente."
                )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(PatientSerializer(instance).data)

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
            # Use all_with_deleted() to find soft-deleted links and restore them
            tp = TutorPatient.objects.all_with_deleted().filter(
                tutor=request.user,
                patient=existing,
            ).first()
            if tp:
                if tp.deleted_at is not None:
                    tp.restore()
            else:
                TutorPatient.objects.create(
                    practice=existing.practice,
                    tutor=request.user,
                    patient=existing,
                    relationship=TutorPatient.OTHER,
                    is_primary=True,
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

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self) -> list:
        if self.action in ("create", "destroy"):
            return [IsDoctor()]
        if self.action in ("partial_update",):
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return TutorPatientCreateSerializer
        if self.action in ("partial_update",):
            return TutorPatientRelationUpdateSerializer
        return TutorPatientSerializer

    def perform_update(self, serializer: TutorPatientRelationUpdateSerializer) -> None:
        # Tutors may only update their own link
        if self.request.user.role == User.TUTOR:
            link = self.get_object()
            if link.tutor != self.request.user:
                self.permission_denied(self.request, message="You can only update your own relationship.")
        serializer.save()

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


class CoResponsibleViewSet(ModelViewSet):
    """CRUD for co-responsible adults linked to the authenticated tutor."""

    permission_classes = [IsAuthenticated]
    serializer_class = CoResponsibleSerializer

    def get_queryset(self) -> QuerySet[CoResponsible]:
        return CoResponsible.objects.filter(tutor=self.request.user)

    def perform_create(self, serializer: CoResponsibleSerializer) -> None:
        # Resolve practice from the tutor's linked patients
        tp = TutorPatient.objects.filter(
            tutor=self.request.user, deleted_at__isnull=True
        ).first()
        practice = tp.practice if tp else None
        serializer.save(tutor=self.request.user, practice=practice)


class GrowthPointSerializer(drf_serializers.Serializer):
    """Flat representation of one anthropometry measurement with encounter date."""

    encounter_id = drf_serializers.IntegerField(source="encounter.id")
    encounter_date = drf_serializers.DateTimeField(source="encounter.scheduled_at")
    age_months = drf_serializers.SerializerMethodField()
    weight_kg = drf_serializers.DecimalField(max_digits=5, decimal_places=2)
    height_cm = drf_serializers.DecimalField(max_digits=5, decimal_places=2)
    head_circumference_cm = drf_serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    bmi = drf_serializers.DecimalField(
        max_digits=5, decimal_places=2, allow_null=True
    )
    weight_for_age_z = drf_serializers.FloatField(allow_null=True)
    height_for_age_z = drf_serializers.FloatField(allow_null=True)
    head_circumference_for_age_z = drf_serializers.FloatField(allow_null=True)
    bmi_for_age_z = drf_serializers.FloatField(allow_null=True)
    weight_for_age_percentile = drf_serializers.FloatField(allow_null=True)
    height_for_age_percentile = drf_serializers.FloatField(allow_null=True)
    head_circumference_for_age_percentile = drf_serializers.FloatField(allow_null=True)
    bmi_for_age_percentile = drf_serializers.FloatField(allow_null=True)

    def get_age_months(self, obj) -> int | None:
        patient = obj.patient
        enc_date = obj.encounter.scheduled_at
        if not patient.date_of_birth or not enc_date:
            return None
        delta = enc_date.date() - patient.date_of_birth
        return int(delta.days / 30.44)


class GrowthHistoryView(APIView):
    """
    GET /patients/<patient_pk>/growth-history/

    Returns all anthropometry records for a patient, ordered chronologically.
    Used by the growth chart in the patient ficha.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, patient_pk: int) -> Response:
        from apps.medical_records.models import Anthropometry

        patient = Patient.objects.filter(pk=patient_pk).first()
        if not patient:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Tutor can only see their linked patients
        user = request.user
        if user.role == User.TUTOR:
            linked = TutorPatient.objects.filter(
                tutor=user, patient=patient, deleted_at__isnull=True
            ).exists()
            if not linked:
                return Response(status=status.HTTP_403_FORBIDDEN)

        records = (
            Anthropometry.objects.filter(patient=patient)
            .select_related("encounter", "patient")
            .order_by("encounter__scheduled_at")
        )
        serializer = GrowthPointSerializer(records, many=True)
        return Response(serializer.data)
