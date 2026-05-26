"""
Views for the practice app.

Public views (AllowAny): read-only access to practice data for the public website.
Admin views (IsDoctor): full CRUD for working hours and blocked slots.
"""

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor
from apps.practice.models import BlockedSlot, Location, Practice, Service, WorkingHours
from apps.practice.serializers import (
    BlockedSlotSerializer,
    LocationSerializer,
    PracticeSerializer,
    ServiceSerializer,
    WorkingHoursSerializer,
)


# ---------------------------------------------------------------------------
# Public views
# ---------------------------------------------------------------------------


class PracticeDetailView(RetrieveAPIView):
    """
    Public endpoint. Returns a single practice by slug.

    GET /api/v1/practices/<slug>/
    """

    serializer_class = PracticeSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = Practice.objects.filter(is_active=True)


class LocationListView(ListAPIView):
    """
    Public endpoint. Returns active locations for a practice.

    GET /api/v1/practices/<slug>/locations/
    """

    serializer_class = LocationSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        practice = get_object_or_404(Practice, slug=self.kwargs["slug"], is_active=True)
        return Location.objects.filter(practice=practice, is_active=True)


class ServiceListView(ListAPIView):
    """
    Public endpoint. Returns active services for a practice.

    GET /api/v1/practices/<slug>/services/
    """

    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        practice = get_object_or_404(Practice, slug=self.kwargs["slug"], is_active=True)
        return Service.objects.filter(practice=practice, is_active=True).prefetch_related("locations")


class WorkingHoursListView(ListAPIView):
    """
    Public endpoint. Returns active working hours for a specific location.

    GET /api/v1/locations/<pk>/working-hours/
    """

    serializer_class = WorkingHoursSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        location = get_object_or_404(Location, pk=self.kwargs["pk"], is_active=True)
        return WorkingHours.objects.filter(location=location, is_active=True).select_related("location")


# ---------------------------------------------------------------------------
# Admin views (IsDoctor only)
# ---------------------------------------------------------------------------


class WorkingHoursAdminViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint. Full CRUD for working hours.

    GET/POST   /api/v1/admin/working-hours/
    GET/PUT/PATCH/DELETE /api/v1/admin/working-hours/<pk>/
    """

    serializer_class = WorkingHoursSerializer
    permission_classes = [IsDoctor]
    pagination_class = StandardPagination

    def get_queryset(self):
        return WorkingHours.objects.select_related("practice", "location").all()


class BlockedSlotAdminViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint. Full CRUD for blocked slots.

    GET/POST   /api/v1/admin/blocked-slots/
    GET/PUT/PATCH/DELETE /api/v1/admin/blocked-slots/<pk>/
    """

    serializer_class = BlockedSlotSerializer
    permission_classes = [IsDoctor]
    pagination_class = StandardPagination

    def get_queryset(self):
        return BlockedSlot.objects.select_related("practice", "location").all()
