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

from django.conf import settings

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
    RescheduleViaTokenSerializer,
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

        location_id_param = self.request.query_params.get("location_id")
        if location_id_param:
            try:
                qs = qs.filter(location_id=int(location_id_param))
            except (ValueError, TypeError):
                pass

        date_from_param = self.request.query_params.get("date_from")
        if date_from_param:
            try:
                date_from = datetime.date.fromisoformat(date_from_param)
                qs = qs.filter(scheduled_date__gte=date_from)
            except ValueError:
                pass

        date_to_param = self.request.query_params.get("date_to")
        if date_to_param:
            try:
                date_to = datetime.date.fromisoformat(date_to_param)
                qs = qs.filter(scheduled_date__lte=date_to)
            except ValueError:
                pass

        return qs

    def perform_create(self, serializer) -> None:
        extra = {}
        user = self.request.user
        if user.role == user.DOCTOR:
            extra["practice"] = user.practice
            extra["doctor"] = user
        appointment = serializer.save(**extra)
        check_and_send_auto_response(appointment)

    @action(detail=True, methods=["post"])
    def cancel(self, request: Request, pk=None) -> Response:
        appointment = self.get_object()

        if appointment.status in (Appointment.CANCELLED, Appointment.EXPIRED):
            # Appointment already terminal — clean up any orphaned pending payment
            payment = getattr(appointment, "payment", None)
            if payment is not None and payment.status in ("PENDING", "TRANSFER_PENDING"):
                payment.status = "FAILED"
                payment.save(update_fields=["status", "updated_at"])
            return Response(
                {"detail": "Appointment cancelled.", "status": appointment.status},
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

        refund_failed = False
        try:
            result = cancel_appointment(
                appointment,
                reason=reason,
                refund=True,
                cancelled_by=request.user,
            )
        except PaymentRefundError as exc:
            logger.warning(
                "cancel: refund failed for Appointment #%s, cancelling without refund: %s",
                appointment.pk,
                exc,
            )
            refund_failed = True
            result = cancel_appointment(
                appointment,
                reason=reason,
                refund=False,
                cancelled_by=request.user,
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
        if refund_failed:
            response_data["refund_warning"] = "Refund could not be processed automatically. Contact the clinic."
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
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("offer_slot", "partial_update"):
            return [IsDoctor()]
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

        status_param = self.request.query_params.get("status")
        if status_param:
            statuses = [s.strip() for s in status_param.split(",")]
            qs = qs.filter(status__in=statuses)

        return qs

    def perform_create(self, serializer) -> None:
        from apps.practice.models import Practice

        user = self.request.user
        if user.role == User.DOCTOR:
            practice = Practice.objects.filter(owner=user).first() or Practice.objects.filter(is_active=True).first()
        else:
            practice = Practice.objects.filter(is_active=True).first()
        serializer.save(practice=practice, status=WaitlistEntry.WAITING)

    def perform_destroy(self, instance) -> None:
        """Soft-delete: set status to CANCELLED instead of hard delete."""
        user = self.request.user
        if user.role == "TUTOR":
            from apps.patients.models import TutorPatient
            if not TutorPatient.objects.filter(tutor=user, patient=instance.patient).exists():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only remove your own patients from the waitlist.")
        instance.status = WaitlistEntry.CANCELLED
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["post"], permission_classes=[IsDoctor], url_path="offer-slot")
    def offer_slot(self, request: Request, pk=None) -> Response:
        """
        POST /api/v1/waitlist/{id}/offer-slot/

        Doctor offers an available slot to a waitlist entry.
        Creates a real Appointment (HOLD) + Payment (PENDING) and sets
        the entry status to OFFERED with a 30-minute confirmation window.

        Body:
            scheduled_date: "YYYY-MM-DD"  (required)
            start_time: "HH:MM"           (required)
            channel: "EMAIL" | "WHATSAPP" | "PHONE"  (default EMAIL)
        """
        entry = self.get_object()

        if entry.status != WaitlistEntry.WAITING:
            return Response(
                {"detail": "Only entries with WAITING status can be offered a slot."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slot_date_str = request.data.get("scheduled_date")
        slot_time_str = request.data.get("start_time")
        channel = request.data.get("channel", "EMAIL")

        if not slot_date_str or not slot_time_str:
            return Response(
                {"detail": "scheduled_date and start_time are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            slot_date = datetime.date.fromisoformat(slot_date_str)
            slot_time = datetime.time.fromisoformat(slot_time_str)
        except ValueError:
            return Response(
                {"detail": "Invalid date or time format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create appointment + payment via hold_appointment
        try:
            appointment, payment = hold_appointment(
                user=request.user,
                practice=entry.practice,
                service=entry.service,
                location=entry.location,
                patient=entry.patient,
                scheduled_date=slot_date,
                start_time=slot_time,
                is_online=(entry.location is None),
                notes=f"From waitlist #{entry.pk}",
                payment_method="MERCADOPAGO",
                booked_by_doctor=True,
            )
        except SlotUnavailableError:
            return Response(
                {"detail": "The selected slot is no longer available."},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as exc:
            logger.error("offer_slot: hold_appointment failed for WaitlistEntry #%s: %s", entry.pk, exc)
            return Response(
                {"detail": f"Could not create appointment: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Create MercadoPago preference for the payment link
        payment_link = ""
        try:
            from apps.billing.services.payment_strategy import create_mp_preference
            preference = create_mp_preference(payment)
            payment_link = preference.get("init_point", "")
        except Exception as exc:
            logger.warning("offer_slot: MP preference failed for Payment #%s: %s", payment.pk, exc)
            frontend_url = getattr(settings, "FRONTEND_URL", "https://estefipediatra.com").rstrip("/")
            payment_link = f"{frontend_url}/portal/pagos"

        # Update waitlist entry to OFFERED
        offer_minutes = 30
        entry.status = WaitlistEntry.OFFERED
        entry.notified_at = timezone.now()
        entry.offer_expires_at = timezone.now() + datetime.timedelta(minutes=offer_minutes)
        entry.offered_appointment = appointment
        entry.save(update_fields=["status", "notified_at", "offer_expires_at", "offered_appointment", "updated_at"])

        # Schedule expiry task
        try:
            from django_q.tasks import schedule
            from django_q.models import Schedule
            schedule(
                "apps.scheduling.services.waitlist_expiry.expire_and_cascade",
                entry.pk,
                schedule_type=Schedule.ONCE,
                next_run=entry.offer_expires_at,
            )
        except Exception as exc:
            logger.warning("offer_slot: could not schedule expiry task: %s", exc)

        # Notify every tutor linked to the patient
        from apps.notifications.models import Notification
        from apps.patients.models import TutorPatient

        tutors_qs = TutorPatient.objects.filter(patient=entry.patient).select_related("tutor")
        for link in tutors_qs:
            Notification.objects.create(
                practice=entry.practice,
                recipient=link.tutor,
                notification_type=Notification.WAITLIST_AVAILABLE,
                title="Turno disponible",
                message=(
                    f"La doctora te ofrece un turno para {entry.patient.full_name} "
                    f"— {entry.service.name}. Tenés 30 minutos para confirmar."
                ),
                related_type="Appointment",
                related_id=appointment.pk,
            )

        # Send email
        if channel == "EMAIL":
            try:
                from apps.notifications.services.email_service import send_waitlist_offer_email
                send_waitlist_offer_email(
                    entry,
                    slot_date=slot_date,
                    slot_time=slot_time,
                    payment_link=payment_link,
                    expires_minutes=offer_minutes,
                )
            except Exception as exc:
                logger.warning("offer_slot: email failed for WaitlistEntry #%s: %s", entry.pk, exc)

        serializer = self.get_serializer(entry)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="decline-offer")
    def decline_offer(self, request: Request, pk=None) -> Response:
        """
        POST /api/v1/waitlist/{id}/decline-offer/

        Tutor declines the offered slot. The linked appointment is expired,
        and the waitlist entry returns to WAITING so the doctor can offer again.
        """
        entry = self.get_object()

        if entry.status != WaitlistEntry.OFFERED:
            return Response(
                {"detail": "Only OFFERED entries can be declined."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify tutor owns this patient
        user = request.user
        if user.role == "TUTOR":
            from apps.patients.models import TutorPatient
            if not TutorPatient.objects.filter(tutor=user, patient=entry.patient).exists():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only decline offers for your own patients.")

        # Expire the linked appointment + payment, then cascade to next candidate
        from apps.scheduling.services.waitlist_expiry import expire_and_cascade
        expire_and_cascade(entry.pk, force=True)

        # Re-fetch after state change
        entry.refresh_from_db()
        serializer = self.get_serializer(entry)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CancellationPolicyView(APIView):
    permission_classes = [IsDoctor]

    def _get_practice(self, request: Request):
        from apps.practice.models import Practice

        practice = Practice.objects.filter(owner=request.user).first()
        if not practice:
            practice = Practice.objects.filter(is_active=True).first()
        if not practice:
            raise Practice.DoesNotExist
        return practice

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

        practice = Practice.objects.filter(owner=self.request.user).first()
        if not practice:
            practice = Practice.objects.filter(is_active=True).first()
        if not practice:
            return CancellationTier.objects.none()
        try:
            policy = CancellationPolicy.objects.get(practice=practice)
            return CancellationTier.objects.filter(policy=policy)
        except CancellationPolicy.DoesNotExist:
            return CancellationTier.objects.none()


class BookingView(APIView):
    """
    POST /api/v1/book/

    Authenticated endpoint that atomically reserves a slot and initiates payment.
    Supports MERCADOPAGO (Wallet Brick) and TRANSFER payment methods.

    TUTOR flow:
        - Validates patient ownership via TutorPatient.
        - For MERCADOPAGO: returns preference_id for Wallet Brick + hold_expires_at.
        - For TRANSFER: returns bank_details and transfer_expires_at.

    DOCTOR flow:
        - Skips TutorPatient ownership check.
        - Always uses MERCADOPAGO.
        - Creates a MercadoPago preference immediately and sends the payment link
          to the patient's primary tutor via email.
        - Returns payment_link (init_point URL) in the response.

    Permissions: IsAuthenticated (role checked inside)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = BookingSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        is_doctor_booking = request.user.role == User.DOCTOR
        payment_method: str = data.get("payment_method", "MERCADOPAGO")

        try:
            appointment, payment = hold_appointment(
                user=request.user,
                practice=data["practice"],
                service=data["service"],
                location=data.get("location"),
                patient=data["patient"],
                scheduled_date=data["scheduled_date"],
                start_time=data["start_time"],
                is_online=data.get("is_online", False),
                call_platform=data.get("call_platform", ""),
                notes=data.get("notes", ""),
                payment_method=payment_method,
                booked_by_doctor=is_doctor_booking,
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

        from apps.billing.models import Payment as PaymentModel

        # ── DOCTOR booking path ───────────────────────────────────────────────
        # Create a MercadoPago preference immediately so the doctor can share the
        # payment link with the patient's tutor without going through the Brick.
        if is_doctor_booking:
            from apps.billing.services.payment_strategy import MercadoPagoStrategy
            from apps.notifications.services.email_service import send_payment_link_email

            payment_link = ""
            try:
                strategy = MercadoPagoStrategy()
                pref_result = strategy.create_preference(payment)
                payment_link = pref_result.get("init_point", "")
            except Exception as exc:
                logger.warning(
                    "BookingView (doctor): preference creation failed for Payment #%s: %s",
                    payment.pk,
                    exc,
                )

            # Send the payment link email to the patient's primary tutor.
            # Failures are non-fatal: the appointment is already created.
            try:
                send_payment_link_email(appointment, payment_link)
            except Exception as exc:
                logger.warning(
                    "BookingView (doctor): send_payment_link_email failed for Appointment #%s: %s",
                    appointment.pk,
                    exc,
                )

            return Response(
                {
                    "appointment_id": appointment.pk,
                    "payment_id": payment.pk,
                    "hold_expires_at": appointment.hold_expires_at,
                    "payment_method": payment_method,
                    "payment_link": payment_link,
                },
                status=status.HTTP_201_CREATED,
            )

        # ── TUTOR booking path ────────────────────────────────────────────────
        if payment_method == PaymentModel.TRANSFER:
            practice = data["practice"]
            bank_details = {
                "bank_name": practice.bank_name,
                "account_type": practice.account_type,
                "account_number": practice.account_number,
                "account_holder": practice.account_holder,
                "account_rut": practice.account_rut,
                "account_email": practice.account_email,
            }
            return Response(
                {
                    "appointment_id": appointment.pk,
                    "payment_id": payment.pk,
                    "payment_method": payment_method,
                    "bank_details": bank_details,
                    "transfer_expires_at": payment.transfer_expires_at,
                },
                status=status.HTTP_201_CREATED,
            )

        # MERCADOPAGO (default) — payment collected via CardPayment Brick
        return Response(
            {
                "appointment_id": appointment.pk,
                "payment_id": payment.pk,
                "hold_expires_at": appointment.hold_expires_at,
                "payment_method": payment_method,
            },
            status=status.HTTP_201_CREATED,
        )


class AutoResponderConfigView(APIView):
    permission_classes = [IsDoctor]

    def _get_practice(self, request: Request):
        from apps.practice.models import Practice

        practice = Practice.objects.filter(owner=request.user).first()
        if not practice:
            practice = Practice.objects.filter(is_active=True).first()
        if not practice:
            raise Practice.DoesNotExist
        return practice

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
                "service_id": appointment.service_id,
                "location_id": appointment.location_id,
                "practice_slug": appointment.practice.slug,
                "is_online": appointment.is_online,
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
        except Exception as exc:
            logger.error("AppointmentActionView: unexpected error for token %s: %s", token_str[:12], exc)
            return Response(
                {"detail": "Could not process the action. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(result, status=status.HTTP_200_OK)


class RescheduleViaTokenView(APIView):
    """
    POST /api/v1/appointments/reschedule-via-token/

    Public endpoint (AllowAny). Validates a RESCHEDULE token and atomically
    reschedules the appointment to a new date/time without requiring auth.

    Request body: { "token": "...", "scheduled_date": "YYYY-MM-DD", "start_time": "HH:MM" }
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RescheduleViaTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data["token"]
        new_date = serializer.validated_data["scheduled_date"]
        new_time = serializer.validated_data["start_time"]

        try:
            token_obj = validate_token(token_str)
        except TokenNotFoundError:
            return Response({"detail": "Token not found."}, status=status.HTTP_404_NOT_FOUND)
        except (TokenExpiredError, TokenUsedError):
            return Response({"detail": "Token is no longer valid."}, status=status.HTTP_410_GONE)

        if token_obj.action != token_obj.RESCHEDULE:
            return Response(
                {"detail": "This token is not for rescheduling."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = token_obj.appointment

        try:
            new_appointment = reschedule_appointment(
                appointment=appointment,
                new_date=new_date,
                new_time=new_time,
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
            logger.error(
                "RescheduleViaTokenView: unexpected error for token %s: %s",
                token_str[:12],
                exc,
            )
            return Response(
                {"detail": "Could not process the reschedule."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Token is consumed by reschedule_appointment (invalidates old tokens)
        # but mark this specific token used explicitly
        token_obj.used_at = timezone.now()
        token_obj.save(update_fields=["used_at"])

        logger.info(
            "RescheduleViaTokenView: rescheduled Appointment #%s to #%s",
            appointment.pk,
            new_appointment.pk,
        )

        return Response(
            {
                "success": True,
                "new_appointment_id": new_appointment.pk,
                "scheduled_date": str(new_appointment.scheduled_date),
                "start_time": str(new_appointment.start_time),
            },
            status=status.HTTP_201_CREATED,
        )
