"""
Views for the practice app.

Public views (AllowAny): read-only access to practice data for the public website.
Admin views (IsDoctor): full CRUD for working hours and blocked slots.
"""

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor
from apps.practice.models import BlockedSlot, Location, Practice, Service, WorkingHours
from apps.practice.serializers import (
    BankDetailsSerializer,
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
        return Location.objects.filter(practice=practice, is_active=True).order_by("pk")


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
        qs = WorkingHours.objects.filter(location=location, is_active=True).select_related("location")
        service_id = self.request.query_params.get("service")
        if service_id:
            # If this service has dedicated presencial blocks, only return those.
            # Otherwise return general blocks (service=NULL).
            has_dedicated = WorkingHours.objects.filter(
                location=location, service_id=service_id, is_online=False, is_active=True,
            ).exists()
            if has_dedicated:
                qs = qs.filter(service_id=service_id)
            else:
                qs = qs.filter(service__isnull=True)
        return qs


class OnlineWorkingHoursListView(ListAPIView):
    """
    Public endpoint. Returns active online working hours for a practice.

    GET /api/v1/practices/<slug>/working-hours/online/
    """

    serializer_class = WorkingHoursSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardPagination

    def get_queryset(self):
        practice = get_object_or_404(Practice, slug=self.kwargs["slug"], is_active=True)
        qs = WorkingHours.objects.filter(
            practice=practice, is_online=True, is_active=True
        ).order_by("day_of_week", "start_time")
        service_id = self.request.query_params.get("service")
        if service_id:
            # If this service has dedicated online blocks, only return those.
            # Otherwise return general blocks (service=NULL).
            has_dedicated = WorkingHours.objects.filter(
                practice=practice, service_id=service_id, is_online=True, is_active=True,
            ).exists()
            if has_dedicated:
                qs = qs.filter(service_id=service_id)
            else:
                qs = qs.filter(service__isnull=True)
        return qs


class OnlineScheduleView(APIView):
    """
    Public endpoint. Returns a display_hours string for online consultations.

    GET /api/v1/practices/<slug>/online-hours/
    """

    permission_classes = [AllowAny]

    def get(self, request, slug):
        practice = get_object_or_404(Practice, slug=slug, is_active=True)
        online_wh = (
            WorkingHours.objects.filter(practice=practice, is_online=True, is_active=True)
            .order_by("day_of_week", "start_time")
        )

        if not online_wh.exists():
            return Response({"display_hours": ""})

        DAY_ABBR = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

        # Group by time range to produce compact display
        groups: dict[str, list[str]] = {}
        for wh in online_wh:
            time_range = f"{wh.start_time:%H:%M} – {wh.end_time:%H:%M}"
            groups.setdefault(time_range, []).append(DAY_ABBR[wh.day_of_week])

        parts = []
        for time_range, days in groups.items():
            parts.append(f"{' y '.join(days) if len(days) <= 2 else ', '.join(days)} · {time_range}")

        return Response({"display_hours": " | ".join(parts)})


class BankDetailsView(APIView):
    """
    Public endpoint. Returns bank account details for transfer payments.

    GET /api/v1/practice/bank-details/

    Returns the 6 bank fields from the first Practice record.
    No authentication required — needed by anonymous users during booking.
    """

    permission_classes = [AllowAny]

    def get(self, request) -> Response:
        from apps.practice.models import Practice

        practice = Practice.objects.first()
        if practice is None:
            return Response(
                {
                    "bank_name": "",
                    "account_type": "",
                    "account_number": "",
                    "account_holder": "",
                    "account_rut": "",
                    "account_email": "",
                }
            )
        serializer = BankDetailsSerializer(practice)
        return Response(serializer.data)


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
