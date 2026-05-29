"""
Serializers for the practice app.

Public serializers are read-only. Admin serializers support full CRUD.
"""

from rest_framework import serializers

from apps.practice.models import BlockedSlot, Location, Practice, Service, WorkingHours


class PracticeSerializer(serializers.ModelSerializer):
    """Read-only serializer for public practice detail."""

    class Meta:
        model = Practice
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "logo",
            "email",
            "phone",
            "website",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class LocationSerializer(serializers.ModelSerializer):
    """Read-only serializer for public location listing."""

    class Meta:
        model = Location
        fields = [
            "id",
            "name",
            "slug",
            "address",
            "city",
            "region",
            "phone",
            "email",
            "display_hours",
            "latitude",
            "longitude",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ServiceSerializer(serializers.ModelSerializer):
    """Read-only serializer for public service listing. Includes location names."""

    locations = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    location_names = serializers.SerializerMethodField()
    modality_display = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "duration_minutes",
            "price_clp",
            "modality",
            "modality_display",
            "display_order",
            "requires_fonasa_validation",
            "requires_manual_coordination",
            "is_active",
            "locations",
            "location_names",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_location_names(self, obj: Service) -> list[str]:
        return list(obj.locations.filter(is_active=True).values_list("name", flat=True))

    def get_modality_display(self, obj: Service) -> str:
        return obj.get_modality_display()


class WorkingHoursSerializer(serializers.ModelSerializer):
    """Serializer for working hours. Includes human-readable day name and location name."""

    day_of_week_display = serializers.CharField(source="get_day_of_week_display", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = WorkingHours
        fields = [
            "id",
            "practice",
            "location",
            "location_name",
            "day_of_week",
            "day_of_week_display",
            "start_time",
            "end_time",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["day_of_week_display", "location_name"]

    def validate(self, attrs: dict) -> dict:
        """Delegate time range validation to the model's clean()."""
        instance = WorkingHours(**attrs)
        instance.clean()
        return attrs


class BlockedSlotSerializer(serializers.ModelSerializer):
    """Serializer for blocked slots."""

    location_name = serializers.SerializerMethodField()

    class Meta:
        model = BlockedSlot
        fields = [
            "id",
            "practice",
            "location",
            "location_name",
            "start_datetime",
            "end_datetime",
            "reason",
            "created_at",
            "updated_at",
        ]

    def get_location_name(self, obj: BlockedSlot) -> str | None:
        return obj.location.name if obj.location else None

    def validate(self, attrs: dict) -> dict:
        """Delegate datetime range validation to the model's clean()."""
        instance = BlockedSlot(**attrs)
        instance.clean()
        return attrs
