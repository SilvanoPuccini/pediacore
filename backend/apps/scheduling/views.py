from __future__ import annotations

import datetime

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import AuditLog
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor, IsTutor
from apps.scheduling.models import (
    Appointment,
    AutoResponderConfig,
    CancellationPolicy,
    CancellationTier,
    WaitlistEntry,
)
from apps.scheduling.serializers import (
    AppointmentCreateSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    AppointmentUpdateSerializer,
    AutoResponderConfigSerializer,
    AvailableSlotSerializer,
    CancellationPolicySerializer,
    CancellationTierSerializer,
    CancelAppointmentSerializer,
    WaitlistEntrySerializer,
)
from apps.scheduling.services.availability import get_available_slots
from apps.scheduling.services.cancellation import cancel_appointment, get_cancellation_penalty

User = get_user_model()


class AppointmentViewSet(viewsets.ModelViewSet):
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.action in ("update", "partial_update", "confirm"):
            return [IsDoctor()]
        if self.action == "destroy":
            return [IsDoctor()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        if self.action in ("update", "partial_update"):
            return AppointmentUpdateSerializer
        if self.action in ("retrieve",):
            return AppointmentDetailSerializer
        return AppointmentListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            Appointment.objects.select_related(
                "patient", "service", "location", "doctor", "booked_by"
            )
        )

        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list(
                "patient_id", flat=True
            )
            qs = qs.filter(patient_id__in=patient_ids)
        elif user.role != User.DOCTOR:
            qs = qs.none()

        date_param = self.request.query_params.get("date")
        if date_param:
            try:
                date = datetime.date.fromisoformat(date_param)
                qs = qs.filter(scheduled_date=date)
            except ValueError:
                pass

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        patient_id_param = self.request.query_params.get("patient_id")
        if patient_id_param:
            qs = qs.filter(patient_id=patient_id_param)

        return qs

    @action(detail=True, methods=["post"])
    def cancel(self, request: Request, pk=None) -> Response:
        appointment = self.get_object()

        if appointment.status == Appointment.CANCELLED:
            return Response(
                {"detail": "Appointment is already cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CancelAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get("reason", "")

        user = request.user
        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            if not TutorPatient.objects.filter(
                tutor=user, patient=appointment.patient
            ).exists():
                return Response(
                    {"detail": "You do not have permission to cancel this appointment."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        penalty_info = get_cancellation_penalty(appointment)
        cancel_appointment(appointment, reason=reason)

        AuditLog.log(
            user=request.user,
            action=AuditLog.UPDATE,
            resource_type="Appointment",
            resource_id=appointment.pk,
            request=request,
            metadata={"action": "cancel", "penalty_percentage": str(penalty_info["penalty_percentage"])},
        )

        return Response(
            {
                "detail": "Appointment cancelled.",
                "penalty_info": penalty_info,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsDoctor])
    def confirm(self, request: Request, pk=None) -> Response:
        appointment = self.get_object()

        if appointment.status not in (Appointment.PENDING,):
            return Response(
                {"detail": "Only pending appointments can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = Appointment.CONFIRMED
        appointment.confirmed_at = timezone.now()
        appointment.save(update_fields=["status", "confirmed_at", "updated_at"])

        serializer = AppointmentDetailSerializer(appointment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AvailableSlotsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        location_id = request.query_params.get("location")
        service_id = request.query_params.get("service")
        date_str = request.query_params.get("date")

        errors = {}
        if not location_id:
            errors["location"] = "This field is required."
        if not service_id:
            errors["service"] = "This field is required."
        if not date_str:
            errors["date"] = "This field is required."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response(
                {"date": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            location_id_int = int(location_id)
            service_id_int = int(service_id)
        except (ValueError, TypeError):
            return Response(
                {"detail": "location and service must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slots = get_available_slots(
            location_id=location_id_int,
            service_id=service_id_int,
            date=date,
        )
        serializer = AvailableSlotSerializer(slots, many=True)
        return Response(serializer.data)


class WaitlistViewSet(viewsets.ModelViewSet):
    serializer_class = WaitlistEntrySerializer
    pagination_class = StandardPagination
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = WaitlistEntry.objects.select_related("patient", "service", "location")

        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list(
                "patient_id", flat=True
            )
            qs = qs.filter(patient_id__in=patient_ids)
        elif user.role != User.DOCTOR:
            qs = qs.none()

        return qs


class CancellationPolicyView(APIView):
    permission_classes = [IsDoctor]

    def _get_practice(self, request: Request):
        from apps.practice.models import Practice

        return get_object_or_404(Practice, owner=request.user)

    def get(self, request: Request) -> Response:
        practice = self._get_practice(request)
        policy = get_object_or_404(CancellationPolicy, practice=practice)
        serializer = CancellationPolicySerializer(policy)
        return Response(serializer.data)

    def put(self, request: Request) -> Response:
        practice = self._get_practice(request)
        policy, _ = CancellationPolicy.objects.get_or_create(practice=practice)
        serializer = CancellationPolicySerializer(policy, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CancellationTierViewSet(viewsets.ModelViewSet):
    serializer_class = CancellationTierSerializer
    permission_classes = [IsDoctor]
    pagination_class = StandardPagination

    def get_queryset(self):
        from apps.practice.models import Practice

        practice = get_object_or_404(Practice, owner=self.request.user)
        try:
            policy = CancellationPolicy.objects.get(practice=practice)
            return CancellationTier.objects.filter(policy=policy)
        except CancellationPolicy.DoesNotExist:
            return CancellationTier.objects.none()


class AutoResponderConfigView(APIView):
    permission_classes = [IsDoctor]

    def _get_practice(self, request: Request):
        from apps.practice.models import Practice

        return get_object_or_404(Practice, owner=request.user)

    def get(self, request: Request) -> Response:
        practice = self._get_practice(request)
        config = get_object_or_404(AutoResponderConfig, practice=practice)
        serializer = AutoResponderConfigSerializer(config)
        return Response(serializer.data)

    def put(self, request: Request) -> Response:
        practice = self._get_practice(request)
        config, _ = AutoResponderConfig.objects.get_or_create(practice=practice)
        serializer = AutoResponderConfigSerializer(config, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
