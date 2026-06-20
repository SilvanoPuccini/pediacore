"""
Views for the medical_records app.

Role-based access:
- DOCTOR  → full CRUD on all clinical records
- TUTOR   → read-only, limited to their linked patients' encounters
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Count, QuerySet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ModelViewSet

from apps.core.models import AuditLog
from apps.core.permissions import IsDoctor
from apps.medical_records.models import (
    Anthropometry,
    Diagnosis,
    DiagnosisCatalog,
    Encounter,
    EncounterTemplate,
    PhysicalExam,
    SOAPNote,
    Vaccination,
    VaccineSchedule,
    VitalSigns,
)
from apps.medical_records.serializers import (
    AnthropometryCreateSerializer,
    AnthropometrySerializer,
    DiagnosisCatalogSerializer,
    DiagnosisSerializer,
    EncounterCreateSerializer,
    EncounterDetailSerializer,
    EncounterListSerializer,
    EncounterTemplateSerializer,
    PhysicalExamSerializer,
    SOAPNoteSerializer,
    VaccinationCreateSerializer,
    VaccinationSerializer,
    VaccineScheduleSerializer,
    VitalSignsSerializer,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helper: get parent encounter, enforcing patient ownership for tutors
# ---------------------------------------------------------------------------


def _get_encounter_for_user(encounter_pk: int, user) -> Encounter:
    """
    Return the encounter with the given PK.

    Tutors may only access encounters for patients they are linked to.
    Raises Encounter.DoesNotExist if not found or access denied.
    """
    qs = Encounter.objects.select_related("patient", "doctor", "practice")
    if user.role == User.TUTOR:
        qs = qs.filter(patient__tutor_patients__tutor=user)
    return qs.get(pk=encounter_pk)


# ---------------------------------------------------------------------------
# EncounterViewSet
# ---------------------------------------------------------------------------


class EncounterViewSet(ModelViewSet):
    """
    CRUD for Encounter records.

    - Doctor: full access to all encounters in the practice.
    - Tutor: read-only, sees only encounters for their linked patients.

    Audit-logged on create and retrieve.
    """

    def get_permissions(self) -> list:
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsDoctor()]

    def get_serializer_class(self):
        if self.action == "create":
            return EncounterCreateSerializer
        if self.action in ("update", "partial_update"):
            return EncounterCreateSerializer
        if self.action == "retrieve":
            return EncounterDetailSerializer
        if self.action == "list" and self.request.query_params.get("expand") == "true":
            return EncounterDetailSerializer
        return EncounterListSerializer

    def get_queryset(self) -> QuerySet[Encounter]:
        user = self.request.user
        patient_id = self.request.query_params.get("patient_id")

        qs = Encounter.objects.select_related("patient", "doctor", "practice", "location").prefetch_related(
            "diagnoses",
        )

        if user.role == User.DOCTOR:
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs

        if user.role == User.TUTOR:
            qs = qs.filter(patient__tutor_patients__tutor=user)
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs

        return qs.none()

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        """Log encounter access for audit trail."""
        instance = self.get_object()
        AuditLog.log(
            user=request.user,
            action=AuditLog.VIEW,
            resource_type="Encounter",
            resource_id=instance.pk,
            request=request,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request: Request, *args, **kwargs) -> Response:
        """Create encounter and emit an audit log entry."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        encounter = serializer.save()

        AuditLog.log(
            user=request.user,
            action=AuditLog.CREATE,
            resource_type="Encounter",
            resource_id=encounter.pk,
            request=request,
        )

        headers = self.get_success_headers(serializer.data)
        return Response(
            EncounterDetailSerializer(encounter).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


# ---------------------------------------------------------------------------
# SOAPNoteViewSet
# ---------------------------------------------------------------------------


class SOAPNoteViewSet(ModelViewSet):
    """
    Create / retrieve / update the SOAP note for a given encounter.

    Nested under /encounters/<encounter_pk>/soap/.
    Doctor-only — tutors cannot access raw clinical notes.
    """

    serializer_class = SOAPNoteSerializer
    permission_classes = [IsDoctor]
    # No list: SOAP is one-to-one with encounter
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[SOAPNote]:
        encounter_pk = self.kwargs.get("encounter_pk")
        return SOAPNote.objects.filter(encounter_id=encounter_pk)

    def perform_create(self, serializer: SOAPNoteSerializer) -> None:
        encounter_pk = self.kwargs.get("encounter_pk")
        encounter = Encounter.objects.get(pk=encounter_pk)
        serializer.save(encounter=encounter, practice=encounter.practice)


# ---------------------------------------------------------------------------
# PhysicalExamViewSet
# ---------------------------------------------------------------------------


class PhysicalExamViewSet(ModelViewSet):
    """
    Create / retrieve / update the physical exam for a given encounter.

    Nested under /encounters/<encounter_pk>/physical-exam/.
    Doctor-only.
    """

    serializer_class = PhysicalExamSerializer
    permission_classes = [IsDoctor]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[PhysicalExam]:
        encounter_pk = self.kwargs.get("encounter_pk")
        return PhysicalExam.objects.filter(encounter_id=encounter_pk)

    def perform_create(self, serializer: PhysicalExamSerializer) -> None:
        encounter_pk = self.kwargs.get("encounter_pk")
        encounter = Encounter.objects.get(pk=encounter_pk)
        serializer.save(encounter=encounter, practice=encounter.practice)


# ---------------------------------------------------------------------------
# VitalSignsViewSet
# ---------------------------------------------------------------------------


class VitalSignsViewSet(ModelViewSet):
    """
    Create / retrieve / update vital signs for a given encounter.

    Nested under /encounters/<encounter_pk>/vital-signs/.
    Doctor-only.
    """

    serializer_class = VitalSignsSerializer
    permission_classes = [IsDoctor]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[VitalSigns]:
        encounter_pk = self.kwargs.get("encounter_pk")
        return VitalSigns.objects.filter(encounter_id=encounter_pk)

    def perform_create(self, serializer: VitalSignsSerializer) -> None:
        encounter_pk = self.kwargs.get("encounter_pk")
        encounter = Encounter.objects.get(pk=encounter_pk)
        serializer.save(encounter=encounter, practice=encounter.practice)


# ---------------------------------------------------------------------------
# AnthropometryViewSet
# ---------------------------------------------------------------------------


class AnthropometryViewSet(ModelViewSet):
    """
    Create / retrieve / update anthropometry for a given encounter.

    Nested under /encounters/<encounter_pk>/anthropometry/.
    - Doctor: full write access.
    - Tutor: read-only for their linked patients.
    """

    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_permissions(self) -> list:
        if self.action in ("retrieve", "list"):
            return [IsAuthenticated()]
        return [IsDoctor()]

    def get_serializer_class(self):
        if self.action == "create":
            return AnthropometryCreateSerializer
        return AnthropometrySerializer

    def get_queryset(self) -> QuerySet[Anthropometry]:
        encounter_pk = self.kwargs.get("encounter_pk")
        user = self.request.user

        qs = Anthropometry.objects.filter(encounter_id=encounter_pk)

        if user.role == User.TUTOR:
            qs = qs.filter(patient__tutor_patients__tutor=user)

        return qs

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        """Audit-log anthropometry reads — growth data is sensitive."""
        instance = self.get_object()
        AuditLog.log(
            user=request.user,
            action=AuditLog.VIEW,
            resource_type="Anthropometry",
            resource_id=instance.pk,
            request=request,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer: AnthropometryCreateSerializer) -> None:
        encounter_pk = self.kwargs.get("encounter_pk")
        encounter = Encounter.objects.select_related("patient", "practice").get(pk=encounter_pk)
        serializer.save(
            encounter=encounter,
            patient=encounter.patient,
            practice=encounter.practice,
        )

    def create(self, request: Request, *args, **kwargs) -> Response:
        """Create and return full serializer (with Z-scores) after save."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        headers = self.get_success_headers(serializer.data)
        return Response(
            AnthropometrySerializer(instance).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


# ---------------------------------------------------------------------------
# EncounterTemplateViewSet
# ---------------------------------------------------------------------------


class EncounterTemplateViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Read-only viewset for encounter templates.

    Supports:
    - Filter by template_type (?template_type=WELL_CHILD)
    - Age filtering (?age_months=6 — returns templates where age_min_months <= 6 <= age_max_months)
    - Free-text search on name (?search=)
    - Ordering by display_order (default)
    """

    serializer_class = EncounterTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["template_type", "display_order", "name"]
    ordering = ["template_type", "display_order"]

    def get_queryset(self) -> QuerySet[EncounterTemplate]:
        qs = EncounterTemplate.objects.filter(is_active=True)

        template_type = self.request.query_params.get("template_type")
        if template_type:
            qs = qs.filter(template_type=template_type)

        age_months = self.request.query_params.get("age_months")
        if age_months is not None:
            try:
                age = int(age_months)
                qs = qs.filter(
                    models.Q(age_min_months__isnull=True) | models.Q(age_min_months__lte=age),
                    models.Q(age_max_months__isnull=True) | models.Q(age_max_months__gte=age),
                )
            except ValueError:
                pass

        return qs


# ---------------------------------------------------------------------------
# DiagnosisCatalogViewSet
# ---------------------------------------------------------------------------


class DiagnosisCatalogViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Read-only viewset for the ICD-10 pediatric diagnosis catalog.

    Supports:
    - Free-text search on code, name and name_es (?search=)
    - Filter by category (?category=respiratory)
    - Ordering by code (default)
    - /frequent/ action: top-10 diagnoses used by the doctor
    """

    serializer_class = DiagnosisCatalogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["code", "name", "name_es"]
    ordering_fields = ["code", "name_es", "category"]
    ordering = ["code"]

    def get_queryset(self) -> QuerySet[DiagnosisCatalog]:
        qs = DiagnosisCatalog.objects.all()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs

    @action(detail=False, methods=["get"], url_path="frequent")
    def frequent(self, request: Request) -> Response:
        """
        Return the top-10 ICD-10 codes most used by the authenticated doctor,
        enriched with catalog metadata when available.
        """
        top_codes = (
            Diagnosis.objects.filter(encounter__doctor=request.user, code__gt="")
            .values("code")
            .annotate(usage_count=Count("id"))
            .order_by("-usage_count")[:10]
        )

        result = []
        for item in top_codes:
            entry = {"code": item["code"], "usage_count": item["usage_count"]}
            catalog = DiagnosisCatalog.objects.filter(code=item["code"]).first()
            if catalog:
                entry.update(
                    {
                        "name": catalog.name,
                        "name_es": catalog.name_es,
                        "category": catalog.category,
                        "is_common": catalog.is_common,
                    }
                )
            result.append(entry)

        return Response(result)


# ---------------------------------------------------------------------------
# DiagnosisViewSet
# ---------------------------------------------------------------------------


class DiagnosisViewSet(ModelViewSet):
    """
    CRUD for diagnoses linked to an encounter.

    Nested under /encounters/<encounter_pk>/diagnoses/.
    Doctor-only.
    """

    serializer_class = DiagnosisSerializer
    permission_classes = [IsDoctor]

    def get_queryset(self) -> QuerySet[Diagnosis]:
        encounter_pk = self.kwargs.get("encounter_pk")
        return Diagnosis.objects.filter(encounter_id=encounter_pk)

    def perform_create(self, serializer: DiagnosisSerializer) -> None:
        encounter_pk = self.kwargs.get("encounter_pk")
        encounter = Encounter.objects.get(pk=encounter_pk)
        serializer.save(encounter=encounter, practice=encounter.practice)


# ---------------------------------------------------------------------------
# VaccineScheduleViewSet
# ---------------------------------------------------------------------------


class VaccineScheduleViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Read-only viewset for the PNI Chile vaccination schedule reference data.

    Supports:
    - Free-text search on name and disease (?search=)
    - Ordering by age_months and display_order (default)
    """

    serializer_class = VaccineScheduleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "disease"]
    ordering_fields = ["age_months", "display_order", "name"]
    ordering = ["age_months", "display_order"]
    queryset = VaccineSchedule.objects.all()


# ---------------------------------------------------------------------------
# VaccinationViewSet
# ---------------------------------------------------------------------------


class VaccinationViewSet(ModelViewSet):
    """
    Full CRUD for vaccination records.

    - Doctor: full write access (create, update, delete).
    - Authenticated users: read access.
    - Filter by ?patient_id= to get a specific patient's vaccines.

    Custom action:
    - GET /vaccinations/patient-status/?patient_id=<id>
      Returns applied, pending, and upcoming vaccines for a patient
      based on their age and the PNI schedule.
    """

    def get_permissions(self) -> list:
        if self.action in ("list", "retrieve", "patient_status"):
            return [IsAuthenticated()]
        return [IsDoctor()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return VaccinationCreateSerializer
        return VaccinationSerializer

    def get_queryset(self) -> QuerySet[Vaccination]:
        qs = Vaccination.objects.select_related(
            "patient", "vaccine_schedule", "administered_by", "practice"
        )
        patient_id = self.request.query_params.get("patient_id")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if self.request.user.role == "TUTOR":
            qs = qs.filter(patient__tutor_patients__tutor=self.request.user)
        return qs

    def perform_create(self, serializer: VaccinationCreateSerializer) -> None:
        """Inject practice from the authenticated doctor's practice."""
        from apps.practice.models import Practice

        practice = Practice.objects.filter(
            owner=self.request.user
        ).first()
        serializer.save(
            practice=practice,
            administered_by=self.request.user,
        )

    @action(detail=False, methods=["get"], url_path="patient-status")
    def patient_status(self, request: Request) -> Response:
        """
        Return the vaccination status for a specific patient.

        Query params:
        - patient_id (required): PK of the Patient.

        Response shape:
        {
            "patient_id": int,
            "patient_name": str,
            "age_months": int,
            "applied": [...],        # vaccines already given
            "pending": [...],        # schedule entries due but not yet given
            "upcoming": [...]        # next schedule entries after patient's current age
        }
        """
        from apps.patients.models import Patient

        patient_id = request.query_params.get("patient_id")
        if not patient_id:
            return Response(
                {"detail": "patient_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response(
                {"detail": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.role == "TUTOR":
            from apps.patients.models import TutorPatient

            if not TutorPatient.objects.filter(
                tutor=request.user, patient=patient, deleted_at__isnull=True
            ).exists():
                raise PermissionDenied("You do not have access to this patient.")

        # Calculate patient age in months
        from datetime import date

        today = date.today()
        dob = patient.date_of_birth
        years = today.year - dob.year
        age_months = years * 12 + (today.month - dob.month)
        if today.day < dob.day:
            age_months -= 1
        age_months = max(0, age_months)

        # Get all schedule entries up to and including patient's current age
        due_schedule = VaccineSchedule.objects.filter(age_months__lte=age_months)

        # Get upcoming entries (beyond patient's age)
        upcoming_schedule = VaccineSchedule.objects.filter(age_months__gt=age_months).order_by(
            "age_months", "display_order"
        )[:10]

        # Get all vaccinations administered to this patient
        administered = Vaccination.objects.filter(patient=patient).select_related("vaccine_schedule")

        # Determine which schedule entries have been covered
        administered_schedule_ids = {
            v.vaccine_schedule_id for v in administered if v.vaccine_schedule_id
        }
        administered_names_doses = {
            (v.vaccine_name, v.dose_label) for v in administered
        }

        applied = []
        pending = []

        for entry in due_schedule:
            # Match by FK first, then fall back to name+dose
            covered = entry.pk in administered_schedule_ids or (
                entry.name, entry.dose_label
            ) in administered_names_doses
            serialized = VaccineScheduleSerializer(entry).data
            if covered:
                applied.append(serialized)
            else:
                pending.append(serialized)

        return Response(
            {
                "patient_id": patient.pk,
                "patient_name": patient.full_name,
                "age_months": age_months,
                "applied": applied,
                "pending": pending,
                "upcoming": VaccineScheduleSerializer(upcoming_schedule, many=True).data,
            }
        )
