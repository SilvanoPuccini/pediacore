"""
Serializers for the core dashboard API endpoints.
"""
from __future__ import annotations

from rest_framework import serializers


class TopServiceSerializer(serializers.Serializer):
    name = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    count = serializers.IntegerField()


class PaymentMethodBreakdownSerializer(serializers.Serializer):
    method = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    count = serializers.IntegerField()


class EncounterTypeBreakdownSerializer(serializers.Serializer):
    type = serializers.CharField()
    count = serializers.IntegerField()


class DashboardAlertSerializer(serializers.Serializer):
    type = serializers.CharField()
    message = serializers.CharField()
    count = serializers.IntegerField()
    severity = serializers.CharField()


class DashboardMetricsSerializer(serializers.Serializer):
    """Response shape for GET /api/v1/dashboard/metrics/"""

    # Core metrics (existing)
    today_count = serializers.IntegerField()
    week_count = serializers.IntegerField()
    month_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    no_show_rate = serializers.FloatField()
    pending_count = serializers.IntegerField()

    # Financial metrics
    avg_per_appointment = serializers.DecimalField(max_digits=12, decimal_places=2)
    collection_rate = serializers.FloatField()
    top_services = TopServiceSerializer(many=True)
    by_payment_method = PaymentMethodBreakdownSerializer(many=True)

    # Clinical metrics
    patients_this_week = serializers.IntegerField()
    occupancy_rate = serializers.FloatField()
    by_encounter_type = EncounterTypeBreakdownSerializer(many=True)

    # Smart alerts
    alerts = DashboardAlertSerializer(many=True)


class RevenuePointSerializer(serializers.Serializer):
    """One data point in the revenue chart response."""

    day = serializers.DateField()
    ingreso = serializers.DecimalField(max_digits=12, decimal_places=2)


class ReminderSerializer(serializers.Serializer):
    """One reminder item in the reminders response."""

    type = serializers.CharField()
    title = serializers.CharField()
    detail = serializers.CharField()
    patient_id = serializers.IntegerField()
