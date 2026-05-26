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
    location_name = serializers.CharField(source="location.name", read_only=True)
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
        ]
        read_only_fields = AppointmentListSerializer.Meta.read_only_fields + [
            "doctor_email",
            "booked_by_email",
            "cancelled_at",
            "confirmed_at",
            "reminder_sent_at",
        ]

    def get_booked_by_email(self, obj: Appointment) -> str | None:
        return obj.booked_by.email if obj.booked_by else None


class AppointmentCreateSerializer(serializers.ModelSerializer):
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

    def validate(self, attrs: dict) -> dict:
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            user = request.user
            if user.role == User.TUTOR:
                from apps.patients.models import TutorPatient

                patient = attrs.get("patient")
                if patient:
                    if not TutorPatient.objects.filter(
                        tutor=user, patient=patient
                    ).exists():
                        raise serializers.ValidationError(
                            {"patient": "You can only book appointments for your linked patients."}
                        )
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
                    if not TutorPatient.objects.filter(
                        tutor=user, patient=patient
                    ).exists():
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
