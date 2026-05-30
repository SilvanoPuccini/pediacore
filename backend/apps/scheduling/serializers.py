from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.scheduling.models import (
    Appointment,
    AutoResponderConfig,
    CancellationPolicy,
    CancellationTier,
    WaitlistEntry,
)

User = get_user_model()


class AppointmentListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    service_name = serializers.CharField(source="service.name", read_only=True)
    location_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_name",
            "service",
            "service_name",
            "location",
            "location_name",
            "scheduled_date",
            "start_time",
            "end_time",
            "status",
            "status_display",
            "is_online",
            "hold_expires_at",
            "meeting_link",
            "attendance_confirmed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "end_time",
            "status_display",
            "patient_name",
            "service_name",
            "location_name",
        ]

    def get_patient_name(self, obj: Appointment) -> str:
        return obj.patient.full_name

    def get_location_name(self, obj: Appointment) -> str:
        if obj.is_online:
            return "Consulta Online"
        return obj.location.name if obj.location else ""


class AppointmentDetailSerializer(AppointmentListSerializer):
    doctor_email = serializers.CharField(source="doctor.email", read_only=True)
    booked_by_email = serializers.SerializerMethodField()

    class Meta(AppointmentListSerializer.Meta):
        fields = AppointmentListSerializer.Meta.fields + [
            "doctor",
            "doctor_email",
            "booked_by",
            "booked_by_email",
            "notes",
            "cancellation_reason",
            "cancelled_at",
            "confirmed_at",
            "reminder_sent_at",
            "attendance_confirmed_at",
            "attendance_confirmed_via",
            "reminder_24h_sent",
            "reminder_2h_sent",
            "rescheduled_from",
            "rescheduled_at",
        ]
        read_only_fields = AppointmentListSerializer.Meta.read_only_fields + [
            "doctor_email",
            "booked_by_email",
            "cancelled_at",
            "confirmed_at",
            "reminder_sent_at",
            "attendance_confirmed_at",
            "reminder_24h_sent",
            "reminder_2h_sent",
            "rescheduled_at",
        ]

    def get_booked_by_email(self, obj: Appointment) -> str | None:
        return obj.booked_by.email if obj.booked_by else None


class AppointmentCreateSerializer(serializers.ModelSerializer):
    location = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.location.field.related_model.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "practice",
            "patient",
            "service",
            "location",
            "doctor",
            "scheduled_date",
            "start_time",
            "end_time",
            "status",
            "is_online",
            "notes",
        ]
        read_only_fields = ["id", "end_time", "status"]

    def _validate_slot(self, attrs: dict, user) -> None:
        """Verify that start_time matches an available slot from get_available_slots.

        Only enforced for TUTOR users. DOCTOR users can create appointments
        outside published slots (e.g. urgent visits, admin bookings).
        """
        from apps.scheduling.services.availability import get_available_slots

        location = attrs.get("location")
        service = attrs.get("service")
        scheduled_date = attrs.get("scheduled_date")
        start_time = attrs.get("start_time")
        is_online = attrs.get("is_online", False)

        if not all([service, scheduled_date, start_time]):
            return

        # Online appointments have no location
        if not is_online and not location:
            return

        location_id = None if is_online else location.pk

        available_slots = get_available_slots(
            location_id=location_id,
            service_id=service.pk,
            date=scheduled_date,
        )

        if not available_slots:
            raise serializers.ValidationError(
                {"start_time": "There are no available slots for the selected date, location, and service."}
            )

        available_start_times = {slot["start_time"] for slot in available_slots}
        requested_start = start_time.strftime("%H:%M")

        if requested_start not in available_start_times:
            raise serializers.ValidationError(
                {
                    "start_time": (
                        f"The selected time ({requested_start}) is not an available slot. "
                        f"Available times: {', '.join(sorted(available_start_times))}."
                    )
                }
            )

    def _validate_no_overlap(self, attrs: dict) -> None:
        """Check that no non-cancelled appointment overlaps this time slot.

        Replicates Appointment.clean() so the overlap check runs on POST
        (DRF's ModelSerializer does not call full_clean() by default).
        """
        import datetime

        location = attrs.get("location")
        scheduled_date = attrs.get("scheduled_date")
        start_time = attrs.get("start_time")
        service = attrs.get("service")
        is_online = attrs.get("is_online", False)

        if not all([scheduled_date, start_time, service]):
            return

        if not is_online and not location:
            return

        duration = datetime.timedelta(minutes=service.duration_minutes)
        start_dt = datetime.datetime.combine(datetime.date.today(), start_time)
        end_time = (start_dt + duration).time()

        overlapping = Appointment.objects.exclude(status__in=Appointment.SLOT_FREE_STATUSES).filter(
            scheduled_date=scheduled_date,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if is_online:
            overlapping = overlapping.filter(is_online=True)
        else:
            overlapping = overlapping.filter(location=location)

        if overlapping.exists():
            raise serializers.ValidationError({"start_time": "There is already an appointment scheduled at this time."})

    def validate(self, attrs: dict) -> dict:
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            user = request.user
            if user.role == User.TUTOR:
                from apps.patients.models import TutorPatient

                patient = attrs.get("patient")
                if patient:
                    if not TutorPatient.objects.filter(tutor=user, patient=patient).exists():
                        raise serializers.ValidationError(
                            {"patient": "You can only book appointments for your linked patients."}
                        )

                self._validate_slot(attrs, user)

        self._validate_no_overlap(attrs)
        return attrs

    def create(self, validated_data: dict) -> Appointment:
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["booked_by"] = request.user
        instance = super().create(validated_data)
        from apps.core.models import AuditLog

        if request:
            AuditLog.log(
                user=request.user,
                action=AuditLog.CREATE,
                resource_type="Appointment",
                resource_id=instance.pk,
                request=request,
            )
        return instance


class AppointmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            "id",
            "scheduled_date",
            "start_time",
            "end_time",
            "status",
            "is_online",
            "notes",
            "doctor",
            "location",
            "service",
        ]
        read_only_fields = ["id", "end_time"]


class CancelAppointmentSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class WaitlistEntrySerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    service_name = serializers.CharField(source="service.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WaitlistEntry
        fields = [
            "id",
            "practice",
            "patient",
            "patient_name",
            "service",
            "service_name",
            "location",
            "preferred_date_start",
            "preferred_date_end",
            "preferred_time_start",
            "preferred_time_end",
            "status",
            "status_display",
            "notified_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "patient_name", "service_name", "status_display", "notified_at"]

    def get_patient_name(self, obj: WaitlistEntry) -> str:
        return obj.patient.full_name

    def validate(self, attrs: dict) -> dict:
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            user = request.user
            if user.role == User.TUTOR:
                from apps.patients.models import TutorPatient

                patient = attrs.get("patient")
                if patient:
                    if not TutorPatient.objects.filter(tutor=user, patient=patient).exists():
                        raise serializers.ValidationError(
                            {"patient": "You can only add your linked patients to the waitlist."}
                        )
        return attrs


class CancellationTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = CancellationTier
        fields = [
            "id",
            "policy",
            "min_hours_before",
            "penalty_percentage",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CancellationPolicySerializer(serializers.ModelSerializer):
    tiers = CancellationTierSerializer(many=True, read_only=True)

    class Meta:
        model = CancellationPolicy
        fields = [
            "id",
            "practice",
            "is_active",
            "description",
            "tiers",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tiers", "created_at", "updated_at"]


class AutoResponderConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutoResponderConfig
        fields = [
            "id",
            "practice",
            "is_active",
            "outside_hours_message",
            "holiday_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AvailableSlotSerializer(serializers.Serializer):
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    available = serializers.BooleanField()


class TokenResolveSerializer(serializers.Serializer):
    """Response serializer for GET /a/{token}/"""

    action = serializers.CharField()
    appointment_id = serializers.IntegerField()
    patient_first_name = serializers.CharField()
    scheduled_date = serializers.DateField()
    start_time = serializers.TimeField()
    location_name = serializers.CharField()
    action_available = serializers.BooleanField()


class AppointmentActionSerializer(serializers.Serializer):
    """Input serializer for POST /api/v1/appointments/action/"""

    token = serializers.CharField(required=True)


class ConfirmAttendanceSerializer(serializers.Serializer):
    """Response serializer for POST /api/v1/appointments/{id}/confirm-attendance/"""

    attendance_confirmed = serializers.BooleanField()
    attendance_confirmed_at = serializers.DateTimeField()
    attendance_confirmed_via = serializers.CharField()


class _LazyPKRelatedField(serializers.PrimaryKeyRelatedField):
    """PrimaryKeyRelatedField that defers queryset resolution until first use.

    This avoids import-time circular dependencies when serializers.py is loaded
    before the related models' apps are fully initialised.
    """

    def __init__(self, app_label: str, model_name: str, **kwargs):
        self._app_label = app_label
        self._model_name = model_name
        kwargs.setdefault("queryset", self._get_queryset())
        super().__init__(**kwargs)

    def _get_queryset(self):
        from django.apps import apps

        return apps.get_model(self._app_label, self._model_name).objects.all()

    def get_queryset(self):
        return self._get_queryset()


class BookingSerializer(serializers.Serializer):
    """Serializer for the POST /api/v1/book/ endpoint.

    Validates the incoming booking request and returns the data needed
    by BookingService.hold_appointment().
    """

    practice = _LazyPKRelatedField("practice", "Practice")
    service = _LazyPKRelatedField("practice", "Service")
    location = _LazyPKRelatedField("practice", "Location", required=False, allow_null=True)
    patient = _LazyPKRelatedField("patients", "Patient")
    scheduled_date = serializers.DateField()
    start_time = serializers.TimeField()
    is_online = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs: dict) -> dict:
        service = attrs.get("service")
        location = attrs.get("location")
        is_online = attrs.get("is_online", False)

        if service and not is_online and location is None:
            # For presential services location is required
            from apps.practice.models import Service as ServiceModel

            if service.modality == ServiceModel.PRESENCIAL:
                raise serializers.ValidationError({"location": "Location is required for presential appointments."})

        return attrs
