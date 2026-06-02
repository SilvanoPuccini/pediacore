from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.scheduling.views import (
    AppointmentActionView,
    AppointmentViewSet,
    AutoResponderConfigView,
    AvailableSlotsView,
    BookingView,
    CancellationPolicyView,
    CancellationTierViewSet,
    TokenResolveView,
    WaitlistViewSet,
)

app_name = "scheduling"

router = DefaultRouter()
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"waitlist", WaitlistViewSet, basename="waitlist")
router.register(r"admin/cancellation-tiers", CancellationTierViewSet, basename="admin-cancellation-tiers")

urlpatterns = [
    path("available-slots/", AvailableSlotsView.as_view(), name="available-slots"),
    path("book/", BookingView.as_view(), name="book"),
    # Must be BEFORE router.urls so they're not matched by the router's appointment-detail pattern
    path("appointments/resolve/<str:token>/", TokenResolveView.as_view(), name="token-resolve"),
    path("appointments/action/", AppointmentActionView.as_view(), name="appointment-action"),
    path("admin/cancellation-policy/", CancellationPolicyView.as_view(), name="admin-cancellation-policy"),
    path("admin/auto-responder/", AutoResponderConfigView.as_view(), name="admin-auto-responder"),
    path("", include(router.urls)),
]
