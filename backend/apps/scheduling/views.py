from __future__ import annotations

import datetime
import logging

logger = logging.getLogger(__name__)

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
    AppointmentActionSerializer,
    AppointmentCreateSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    AppointmentUpdateSerializer,
    AutoResponderConfigSerializer,
    AvailableSlotSerializer,
    BookingSerializer,
    CancelAppointmentSerializer,
    CancellationPolicySerializer,
    CancellationTierSerializer,
    ConfirmAttendanceSerializer,
    RescheduleSerializer,
    TokenResolveSerializer,
    WaitlistEntrySerializer,
)
from apps.scheduling.services.auto_responder import check_and_send_auto_response
from apps.scheduling.services.availability import get_available_slots
from apps.billing.services.payment_strategy import PaymentRefundError
from apps.scheduling.services.booking_service import (
    SlotUnavailableError,
    hold_appointment,
)
from apps.scheduling.services.cancellation import cancel_appointment, get_cancellation_penalty
from apps.scheduling.services.reschedule_service import (
    AppointmentNotReschedulableError,
    reschedule_appointment,
)
from apps.scheduling.services.token_service import (
    TokenExpiredError,
    TokenNotFoundError,
    TokenUsedError,
    execute_token_action,
    validate_token,
)

User = get_user_model()


class AppointmentViewSet(viewsets.ModelViewSet):
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.action in ("update", "partial_update", "confirm"):
            return [IsDoctor()]
        if self.action == "destroy":
            return [IsDoctor()]
        if self.action == "confirm_attendance":
            return [IsTutor()]
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
        qs = Appointment.objects.select_related("patient", "service", "location", "doctor", "booked_by")

        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list("patient_id", flat=True)
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
            statuses = [s.strip() for s in status_param.split(",")]
            if len(statuses) > 1:
                qs = qs.filter(status__in=statuses)
            else:
                qs = qs.filter(status=status_param)

        patient_id_param = self.request.query_params.get("patient_id")
        if patient_id_param:
            qs = qs.filter(patient_id=patient_id_param)

        return qs

    def perform_create(self, serializer) -> None:
        appointment = serializer.save()
        check_and_send_auto_response(appointment)

    @action(detail=True, methods=["post"])
    def cancel(self, request: Request, pk=None) -> Response:
        appointment = self.get_object()

        if appointment.status == Appointment.CANCELLED:
            return Response(
                {"detail": "Appointment is already cancelled.", "code": "APPOINTMENT_ALREADY_CANCELLED"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CancelAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get("reason", "")

        user = request.user
        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            if not TutorPatient.objects.filter(tutor=user, patient=appointment.patient).exists():
                return Response(
                    {"detail": "You do not have permission to cancel this appointment."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            result = cancel_appointment(
                appointment,
                reason=reason,
                refund=True,
                cancelled_by=request.user,
            )
        except PaymentRefundError as exc:
            return Response(
                {"detail": f"Refund processing failed: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        refund_info = result.get("refund_info")
        penalty_info = get_cancellation_penalty(appointment) if refund_info is None else {}

        AuditLog.log(
            user=request.user,
            action=AuditLog.UPDATE,
            resource_type="Appointment",
            resource_id=appointment.pk,
            request=request,
            metadata={
                "action": "cancel",
                "refund_amount": refund_info.get("refund_amount") if refund_info else None,
                "penalty_percentage": refund_info.get("penalty_percentage") if refund_info else None,
            },
        )

        response_data: dict = {"detail": "Appointment cancelled."}
        if refund_info:
            response_data["refund_amount"] = refund_info.get("refund_amount")
            response_data["penalty_percentage"] = refund_info.get("penalty_percentage")
        elif penalty_info:
            response_data["penalty_info"] = penalty_info

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsDoctor])
    def confirm(self, request: Request, pk=None) -> Response:
        appointment = self.get_object()

        if appointment.status not in (Appointment.PENDING, Appointment.HOLD):
            return Response(
                {"detail": "Only pending or held appointments can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = Appointment.CONFIRMED
        appointment.confirmed_at = timezone.now()
        appointment.save(update_fields=["status", "confirmed_at", "updated_at"])

        serializer = AppointmentDetailSerializer(appointment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsTutor], url_path="confirm-attendance")
    def confirm_attendance(self, request: Request, pk=None) -> Response:
        """
        POST /api/v1/appointments/{id}/confirm-attendance/

        Allows an authenticated tutor to confirm they attended their appointment.
        Only works on CONFIRMED appointments. Idempotent.
        """
        appointment = self.get_object()

        if appointment.status != Appointment.CONFIRMED:
            return Response(
                {"detail": "Attendance can only be confirmed for CONFIRMED appointments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        appointment.attendance_confirmed = True
        appointment.attendance_confirmed_at = now
        appointment.attendance_confirmed_via = "PORTAL"
        appointment.save(
            update_fields=[
                "attendance_confirmed",
                "attendance_confirmed_at",
                "attendance_confirmed_via",
                "updated_at",
            ]
        )

        serializer = ConfirmAttendanceSerializer(
            {
                "attendance_confirmed": appointment.attendance_confirmed,
                "attendance_confirmed_at": appointment.attendance_confirmed_at,
                "attendance_confirmed_via": appointment.attendance_confirmed_via,
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


    @action(detail=True, methods=["post"], permission_classes=[IsTutor], url_path="reschedule")
    def reschedule(self, request: Request, pk=None) -> Response:
        """
        POST /api/v1/appointments/{id}/reschedule/

        Allows an authenticated tutor to reschedule their confirmed appointment
        to a new date and time. Atomically creates a new CONFIRMED appointment
        and marks the old one RESCHEDULED.

        Permissions: IsTutor (ownership verified via queryset filter)
        """
        appointment = self.get_object()

        serializer = RescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_date = serializer.validated_data["scheduled_date"]
        new_time = serializer.validated_data["start_time"]

        try:
            new_appointment = reschedule_appointment(
                appointment=appointment,
                new_date=new_date,
                new_time=new_time,
                rescheduled_by=request.user,
            )
        except AppointmentNotReschedulableError as exc:
            return Response(
                {"detail": str(exc), "code": "APPOINTMENT_NOT_RESCHEDULABLE"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except SlotUnavailableError as exc:
            return Response(
                {"detail": str(exc), "code": "SLOT_CONFLICT"},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        AuditLog.log(
            user=request.user,
            action=AuditLog.CREATE,
            resource_type="Appointment",
            resource_id=new_appointment.pk,
            request=request,
            metadata={
                "action": "reschedule",
                "old_appointment_id": appointment.pk,
                "new_date": str(new_date),
                "new_time": str(new_time),
            },
        )

        serializer_out = AppointmentDetailSerializer(new_appointment)
        return Response(serializer_out.data, status=status.HTTP_201_CREATED)


class AvailableSlotsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        location_id = request.query_params.get("location", "").strip()
        service_id = request.query_params.get("service")
        date_str = request.query_params.get("date")

        errors = {}
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

        # location is optional — empty means online consultation
        location_id_int: int | None = None
        if location_id:
            try:
                location_id_int = int(location_id)
            except (ValueError, TypeError):
                return Response(
                    {"location": "Must be a valid integer or empty for online."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            service_id_int = int(service_id)
        except (ValueError, TypeError):
            return Response(
                {"service": "Must be a valid integer."},
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

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list("patient_id", flat=True)
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


class BookingView(APIView):
    """
    POST /api/v1/book/

    Authenticated TUTOR endpoint that atomically reserves a slot and initiates
    a MercadoPago payment. Returns the checkout URL and appointment details.

    Permissions: IsAuthenticated + IsTutor
    """

    permission_classes = [IsTutor]

    def post(self, request: Request) -> Response:
        serializer = BookingSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            appointment, payment, init_point = hold_appointment(
                user=request.user,
                practice=data["practice"],
                service=data["service"],
                location=data.get("location"),
                patient=data["patient"],
                scheduled_date=data["scheduled_date"],
                start_time=data["start_time"],
                is_online=data.get("is_online", False),
                notes=data.get("notes", ""),
            )
        except PermissionError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_403_FORBIDDEN,
            )
        except SlotUnavailableError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as exc:
            # Includes ValidationError from service and unexpected errors
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                return Response(
                    {"detail": exc.message if hasattr(exc, "message") else str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            logger.error("BookingView: payment failed — %s: %s", type(exc).__name__, exc)
            return Response(
                {"detail": "Ocurrió un error al procesar el pago. Por favor, intentá de nuevo."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "appointment_id": appointment.pk,
                "payment_id": payment.pk,
                "checkout_url": init_point,
                "hold_expires_at": appointment.hold_expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


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


class TokenResolveView(APIView):
    """
    GET /a/{token}/

    Public endpoint (AllowAny). Returns appointment context for the given token.
    Used by tutors clicking email action links.

    Returns:
        200: Token is valid — includes appointment details and action availability.
        404: Token does not exist.
        410: Token is expired or already used.
    """

    permission_classes = [AllowAny]

    def get(self, request: Request, token: str) -> Response:
        try:
            token_obj = validate_token(token)
        except TokenNotFoundError:
            return Response({"detail": "Token not found."}, status=status.HTTP_404_NOT_FOUND)
        except (TokenExpiredError, TokenUsedError):
            return Response({"detail": "Token is no longer valid."}, status=status.HTTP_410_GONE)

        appointment = token_obj.appointment
        patient = appointment.patient

        # CANCEL and CONFIRM are available inline; RESCHEDULE redirects to frontend
        action_available = token_obj.action in (token_obj.CONFIRM, token_obj.CANCEL)

        location_name: str
        if appointment.is_online:
            location_name = "Consulta Online"
        else:
            location_name = appointment.location.name if appointment.location else ""

        serializer = TokenResolveSerializer(
            {
                "action": token_obj.action,
                "appointment_id": appointment.pk,
                "patient_first_name": patient.first_name,
                "scheduled_date": appointment.scheduled_date,
                "start_time": appointment.start_time,
                "location_name": location_name,
                "action_available": action_available,
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class AppointmentActionView(APIView):
    """
    POST /api/v1/appointments/action/

    Public endpoint (AllowAny). Executes the action associated with a token.
    Used by tutors after clicking an email link and confirming an action.

    Request body: { "token": "<token_string>" }

    Returns:
        200: Action executed or deferred.
        400: Missing/invalid token field.
        404: Token does not exist.
        410: Token expired or already used.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = AppointmentActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data["token"]

        try:
            result = execute_token_action(token_str)
        except TokenNotFoundError:
            return Response({"detail": "Token not found."}, status=status.HTTP_404_NOT_FOUND)
        except (TokenExpiredError, TokenUsedError):
            return Response({"detail": "Token is no longer valid."}, status=status.HTTP_410_GONE)

        return Response(result, status=status.HTTP_200_OK)
