"""
URL configuration for the core app — dashboard endpoints.
"""

from django.urls import path

from apps.core.views import DashboardMetricsView, RemindersView, RevenueChartView

app_name = "core"

urlpatterns = [
    path("dashboard/metrics/", DashboardMetricsView.as_view(), name="dashboard-metrics"),
    path("dashboard/revenue-chart/", RevenueChartView.as_view(), name="dashboard-revenue-chart"),
    path("dashboard/reminders/", RemindersView.as_view(), name="dashboard-reminders"),
]
