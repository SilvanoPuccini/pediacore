"""
Serializers for the core dashboard API endpoints.
"""
from __future__ import annotations

from rest_framework import serializers


class DashboardMetricsSerializer(serializers.Serializer):
    """Response shape for GET /api/v1/dashboard/metrics/"""

    today_count = serializers.IntegerField()
    week_count = serializers.IntegerField()
    month_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    no_show_rate = serializers.FloatField()
    pending_count = serializers.IntegerField()


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
