"""
Views for the practice app.

Public views (AllowAny): read-only access to practice data for the public website.
Admin views (IsDoctor): full CRUD for working hours and blocked slots.
"""

from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor, get_practice
from apps.practice.models import BlockedSlot, Location, Practice, Service, WorkingHours
from apps.practice.serializers import (
    BankDetailsSerializer,
    BlockedSlotSerializer,
    LocationAdminSerializer,
    LocationSerializer,
    PracticeSerializer,
    PracticeSettingsSerializer,
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


class LocationAdminViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint. Full CRUD for locations.

    GET/POST   /api/v1/admin/locations/
    GET/PUT/PATCH/DELETE /api/v1/admin/locations/<pk>/
    """

    serializer_class = LocationAdminSerializer
    permission_classes = [IsDoctor]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Location.objects.select_related("practice").all()


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


class PracticeSettingsView(APIView):
    """
    GET/PATCH /api/v1/admin/practice-settings/

    Read and update practice-level settings (e.g. is_online_enabled).
    """

    permission_classes = [IsDoctor]

    def get(self, request):
        practice = get_practice(request.user)
        if practice is None:
            return Response({"detail": "No practice found."}, status=404)
        serializer = PracticeSettingsSerializer(practice)
        return Response(serializer.data)

    def patch(self, request):
        practice = get_practice(request.user)
        if practice is None:
            return Response({"detail": "No practice found."}, status=404)
        serializer = PracticeSettingsSerializer(practice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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
        return BlockedSlot.objects.select_related("practice", "location").order_by("start_datetime")

    def perform_create(self, serializer):
        practice = get_practice(self.request.user)
        if practice is None:
            raise serializers.ValidationError({"practice": "User has no associated practice."})
        serializer.save(practice=practice)

    @action(detail=False, methods=["post"], url_path="check-conflicts")
    def check_conflicts(self, request: Request) -> Response:
        """Return appointments that would be affected by a new blocked slot.

        POST /api/v1/admin/blocked-slots/check-conflicts/
        Body: {"start_datetime": "...", "end_datetime": "..."}
        """
        from apps.scheduling.models import Appointment

        start = request.data.get("start_datetime", "")
        end = request.data.get("end_datetime", "")
        if not start or not end:
            return Response({"appointments": [], "count": 0})

        from django.utils.dateparse import parse_datetime
        start_dt = parse_datetime(start)
        end_dt = parse_datetime(end)
        if not start_dt or not end_dt:
            return Response({"appointments": [], "count": 0})

        conflicts = Appointment.objects.filter(
            scheduled_date__gte=start_dt.date(),
            scheduled_date__lte=end_dt.date(),
            status__in=Appointment.SLOT_BLOCKING_STATUSES,
        ).select_related("patient", "service").order_by("scheduled_date", "start_time")

        data = [
            {
                "id": a.id,
                "patient_name": f"{a.patient.first_name} {a.patient.last_name}",
                "service_name": a.service.name,
                "scheduled_date": str(a.scheduled_date),
                "start_time": str(a.start_time),
                "status": a.status,
            }
            for a in conflicts[:20]
        ]
        return Response({"appointments": data, "count": conflicts.count()})
