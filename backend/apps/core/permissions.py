"""
Custom DRF permissions for PEDIACORE.

Role constants are sourced directly from the User model to avoid hardcoding strings.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

User = get_user_model()


def get_practice(user):
    """Return the practice for this user, with single-tenant fallback.

    Tries user.owned_practices first. If no ownership link exists
    (common when the Practice was created via Django admin with a
    different superuser), falls back to Practice.objects.first()
    since PEDIACORE is single-tenant.
    """
    from apps.practice.models import Practice

    practice = getattr(user, "practice", None)
    if practice is None:
        practice = Practice.objects.first()
    return practice


class IsDoctor(BasePermission):
    """Allow access only to authenticated users with the DOCTOR role."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.DOCTOR
        )


class IsTutor(BasePermission):
    """Allow access only to authenticated users with the TUTOR role."""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.TUTOR
        )


class IsOwnerOrDoctor(BasePermission):
    """
    Object-level permission.

    Grants access when the requesting user is the object's owner
    (obj.user == request.user) OR has the DOCTOR role.
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request: Request, view: APIView, obj) -> bool:
        if request.user.role == User.DOCTOR:
            return True
        return hasattr(obj, "user") and obj.user == request.user
