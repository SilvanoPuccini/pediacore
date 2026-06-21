"""
URL patterns for the practice app.

Public endpoints are under practices/ and locations/.
Admin endpoints are under admin/ and require IsDoctor permission.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.practice.views import (
    BankDetailsView,
    BlockedSlotAdminViewSet,
    LocationAdminViewSet,
    LocationListView,
    OnlineScheduleView,
    OnlineWorkingHoursListView,
    PracticeDetailView,
    ServiceListView,
    WorkingHoursAdminViewSet,
    WorkingHoursListView,
)

app_name = "practice"

router = DefaultRouter()
router.register(r"admin/locations", LocationAdminViewSet, basename="admin-locations")
router.register(r"admin/working-hours", WorkingHoursAdminViewSet, basename="admin-working-hours")
router.register(r"admin/blocked-slots", BlockedSlotAdminViewSet, basename="admin-blocked-slots")

urlpatterns = [
    # Public read-only endpoints
    path("practice/bank-details/", BankDetailsView.as_view(), name="bank-details"),
    path("practices/<slug:slug>/", PracticeDetailView.as_view(), name="practice-detail"),
    path("practices/<slug:slug>/locations/", LocationListView.as_view(), name="location-list"),
    path("practices/<slug:slug>/services/", ServiceListView.as_view(), name="service-list"),
    path("practices/<slug:slug>/online-hours/", OnlineScheduleView.as_view(), name="online-schedule"),
    path("practices/<slug:slug>/working-hours/online/", OnlineWorkingHoursListView.as_view(), name="online-working-hours"),
    path("locations/<int:pk>/working-hours/", WorkingHoursListView.as_view(), name="working-hours-list"),
    # Admin endpoints (ModelViewSet via router)
    path("", include(router.urls)),
]
