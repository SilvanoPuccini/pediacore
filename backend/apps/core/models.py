"""
Core abstract base models and mixins for PEDIACORE.

These are inherited by all business models across the platform.
"""

from __future__ import annotations

from typing import Optional

from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Managers
# ---------------------------------------------------------------------------


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that adds bulk soft-delete and restore operations."""

    def soft_delete(self) -> int:
        return self.update(deleted_at=timezone.now())

    def restore(self) -> int:
        return self.update(deleted_at=None)


class SoftDeleteManager(models.Manager):
    """
    Default manager for SoftDeleteModel.

    Excludes soft-deleted records by default.
    Use .all_with_deleted() or .deleted_only() to bypass the filter.
    """

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)

    def all_with_deleted(self) -> SoftDeleteQuerySet:
        """Return all records, including soft-deleted ones."""
        return SoftDeleteQuerySet(self.model, using=self._db)

    def deleted_only(self) -> SoftDeleteQuerySet:
        """Return only soft-deleted records."""
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=False)


# ---------------------------------------------------------------------------
# Abstract mixins
# ---------------------------------------------------------------------------


class TimeStampedModel(models.Model):
    """
    Abstract mixin that adds created_at and updated_at timestamps.

    All business models should inherit from BaseModel (which includes this),
    or from this directly when soft-delete is not needed.
    """

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """
    Abstract mixin that adds soft-delete capability.

    Records are never truly deleted; deleted_at is set instead.
    Hard deletion is still available via hard_delete().
    """

    deleted_at = models.DateTimeField(null=True, blank=True)

    objects: SoftDeleteManager = SoftDeleteManager()

    class Meta:
        abstract = True

    # ------------------------------------------------------------------
    # Instance helpers
    # ------------------------------------------------------------------

    def soft_delete(self) -> None:
        """Mark this record as deleted without removing it from the database."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def restore(self) -> None:
        """Clear the deleted_at flag, making the record active again."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])

    def hard_delete(self, *args, **kwargs) -> tuple:
        """Permanently delete the record from the database."""
        return super().delete(*args, **kwargs)

    def delete(self, using=None, keep_parents: bool = False):  # type: ignore[override]
        """Override default delete to perform a soft delete instead."""
        self.soft_delete()
        return (0, {})

    @property
    def is_deleted(self) -> bool:
        """Return True if this record has been soft-deleted."""
        return self.deleted_at is not None


# ---------------------------------------------------------------------------
# Composite base model
# ---------------------------------------------------------------------------


class BaseModel(TimeStampedModel, SoftDeleteModel):
    """
    Base model for all PEDIACORE business entities.

    Combines timestamps and soft-delete in a single abstract class.
    Every app model should inherit from this unless there is a specific reason not to.
    """

    class Meta:
        abstract = True
        ordering = ["-created_at"]


# ---------------------------------------------------------------------------
# AuditLog — concrete model
# ---------------------------------------------------------------------------


class AuditLog(models.Model):
    """
    Immutable audit trail for access to sensitive data (medical records).

    Created programmatically via AuditLog.log(). Never edited or deleted
    through the admin or the API.
    """

    # Action choices
    VIEW = "VIEW"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXPORT = "EXPORT"

    ACTION_CHOICES = [
        (VIEW, "View"),
        (CREATE, "Create"),
        (UPDATE, "Update"),
        (DELETE, "Delete"),
        (EXPORT, "Export"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=100)
    resource_id = models.PositiveIntegerField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["resource_type", "resource_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} {self.action} {self.resource_type}:{self.resource_id}"

    @classmethod
    def log(
        cls,
        user,
        action: str,
        resource_type: str,
        resource_id: int,
        request=None,
        **kwargs,
    ) -> "AuditLog":
        """
        Create an audit log entry.

        Automatically extracts ip_address and user_agent from the request
        object when provided.

        Args:
            user: The user performing the action.
            action: One of AuditLog.ACTION_CHOICES values.
            resource_type: Model name, e.g. "Patient" or "Encounter".
            resource_id: PK of the affected record.
            request: Optional Django/DRF request — used to extract IP and UA.
            **kwargs: Extra fields forwarded to metadata.
        """
        ip_address: Optional[str] = None
        user_agent: Optional[str] = None

        if request is not None:
            ip_address = cls._get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:500] or None

        metadata = kwargs.pop("metadata", {})
        if kwargs:
            metadata.update(kwargs)

        return cls.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata,
        )

    @staticmethod
    def _get_client_ip(request) -> Optional[str]:
        """Extract the real client IP, respecting X-Forwarded-For when present."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR") or None
