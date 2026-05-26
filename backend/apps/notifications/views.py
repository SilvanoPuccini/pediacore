"""
Views for the notifications app.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor
from apps.notifications.models import EmailLog, Notification, NotificationPreference
from apps.notifications.serializers import (
    EmailLogSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
    SendNotificationSerializer,
)

User = get_user_model()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve the authenticated user's own notifications.

    Provides additional actions for marking notifications as read.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request: Request, pk=None) -> Response:
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request: Request) -> Response:
        """Mark all unread notifications for the current user as read."""
        from django.utils import timezone

        updated = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({"marked_read": updated}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request: Request) -> Response:
        """Return the count of unread notifications for the current user."""
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


class NotificationPreferenceView(APIView):
    """
    Retrieve and update the authenticated user's notification preferences.

    Preferences are auto-created on first access (get_or_create).
    The user's practice is resolved from the doctor's practice or via
    the first linked patient's practice for tutors.
    """

    permission_classes = [IsAuthenticated]

    def _get_or_create_preferences(self, request: Request):
        """
        Return the user's NotificationPreference, creating it if absent.

        Practice resolution:
        - DOCTOR: the practice they own.
        - TUTOR/others: the practice of the first patient they are linked to,
          or None if no link exists yet (preference created without practice FK).
        """
        user = request.user
        practice = None

        if user.role == User.DOCTOR:
            from apps.practice.models import Practice

            practice = Practice.objects.filter(owner=user).first()
        else:
            from apps.patients.models import TutorPatient

            link = TutorPatient.objects.filter(tutor=user).select_related("patient__practice").first()
            if link:
                practice = link.patient.practice

        if practice is None:
            # Fallback: any practice (safe for TFM single-practice deployment)
            from apps.practice.models import Practice

            practice = Practice.objects.first()

        prefs, _ = NotificationPreference.objects.get_or_create(
            user=user,
            defaults={"practice": practice},
        )
        # Ensure practice is set if it was None on creation and is now available
        if prefs.practice_id is None and practice is not None:
            prefs.practice = practice
            prefs.save(update_fields=["practice"])

        return prefs

    def get(self, request: Request) -> Response:
        prefs = self._get_or_create_preferences(request)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def put(self, request: Request) -> Response:
        prefs = self._get_or_create_preferences(request)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve email logs.

    Accessible only to users with the DOCTOR role.
    """

    serializer_class = EmailLogSerializer
    permission_classes = [IsDoctor]
    pagination_class = StandardPagination

    def get_queryset(self):
        return EmailLog.objects.all()


class SendNotificationView(APIView):
    """
    Manually send a notification to any user.

    Accessible only to users with the DOCTOR role.
    Creates a Notification record; does NOT send an email (use email_service for that).
    """

    permission_classes = [IsDoctor]

    def post(self, request: Request) -> Response:
        serializer = SendNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        recipient = get_object_or_404(User, pk=data["recipient_id"])

        # Resolve the doctor's practice
        from apps.practice.models import Practice

        practice = get_object_or_404(Practice, owner=request.user)

        notification = Notification.objects.create(
            practice=practice,
            recipient=recipient,
            notification_type=data["notification_type"],
            title=data["title"],
            message=data["message"],
            related_type=data.get("related_type", ""),
            related_id=data.get("related_id"),
        )

        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_201_CREATED,
        )
