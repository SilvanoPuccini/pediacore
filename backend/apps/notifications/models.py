"""
Notification models for PEDIACORE.

Handles in-app notifications, email logs, and per-user notification preferences.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, TimeStampedModel


class Notification(BaseModel):
    """
    In-app notification for a user.

    Tracks read status and optionally references a related domain object
    via a lightweight generic FK (related_type + related_id) without
    depending on django.contrib.contenttypes.
    """

    APPOINTMENT_REMINDER = "APPOINTMENT_REMINDER"
    APPOINTMENT_CONFIRMED = "APPOINTMENT_CONFIRMED"
    APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED"
    WAITLIST_AVAILABLE = "WAITLIST_AVAILABLE"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    GENERAL = "GENERAL"

    NOTIFICATION_TYPE_CHOICES = [
        (APPOINTMENT_REMINDER, _("Appointment Reminder")),
        (APPOINTMENT_CONFIRMED, _("Appointment Confirmed")),
        (APPOINTMENT_CANCELLED, _("Appointment Cancelled")),
        (WAITLIST_AVAILABLE, _("Waitlist Available")),
        (PAYMENT_RECEIVED, _("Payment Received")),
        (GENERAL, _("General")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("practice"),
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("recipient"),
    )
    notification_type = models.CharField(
        _("notification type"),
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        default=GENERAL,
    )
    title = models.CharField(_("title"), max_length=255)
    message = models.TextField(_("message"))
    is_read = models.BooleanField(_("is read"), default=False)
    read_at = models.DateTimeField(_("read at"), null=True, blank=True)
    related_type = models.CharField(
        _("related type"),
        max_length=50,
        blank=True,
        help_text=_("Model name, e.g. Appointment or Payment"),
    )
    related_id = models.PositiveIntegerField(
        _("related id"),
        null=True,
        blank=True,
        help_text=_("Primary key of the related object"),
    )

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        verbose_name = _("notification")
        verbose_name_plural = _("notifications")

    def __str__(self) -> str:
        return f"{self.recipient.email} — {self.get_notification_type_display()} ({self.title})"

    def mark_as_read(self) -> None:
        """Mark this notification as read and record the timestamp."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at", "updated_at"])


class EmailLog(TimeStampedModel):
    """
    Immutable log of every outbound email sent by PEDIACORE.

    Records Resend provider responses, status, and error details.
    This model intentionally does not use soft-delete — email logs are
    an audit trail and must never be hidden or deleted.
    """

    QUEUED = "QUEUED"
    SENT = "SENT"
    FAILED = "FAILED"

    STATUS_CHOICES = [
        (QUEUED, _("Queued")),
        (SENT, _("Sent")),
        (FAILED, _("Failed")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="email_logs",
        null=True,
        blank=True,
        verbose_name=_("practice"),
    )
    recipient_email = models.EmailField(_("recipient email"))
    subject = models.CharField(_("subject"), max_length=500)
    body_preview = models.TextField(
        _("body preview"),
        blank=True,
        help_text=_("First 500 characters of the email body"),
    )
    status = models.CharField(
        _("status"),
        max_length=10,
        choices=STATUS_CHOICES,
        default=QUEUED,
    )
    provider = models.CharField(_("provider"), max_length=50, default="resend")
    external_id = models.CharField(
        _("external id"),
        max_length=255,
        blank=True,
        help_text=_("Resend message ID returned by the provider"),
    )
    error_message = models.TextField(_("error message"), blank=True)
    sent_at = models.DateTimeField(_("sent at"), null=True, blank=True)

    class Meta:
        db_table = "email_logs"
        ordering = ["-created_at"]
        verbose_name = _("email log")
        verbose_name_plural = _("email logs")

    def __str__(self) -> str:
        return f"{self.recipient_email} — {self.subject} ({self.status})"


class NotificationTemplate(BaseModel):
    """
    Reusable templates for common notification messages.

    Supports variable substitution via {{paciente}}, {{tutor}}, {{fecha}} placeholders.
    """

    REMINDER = "REMINDER"
    RESULT = "RESULT"
    BIRTHDAY = "BIRTHDAY"
    VACCINATION = "VACCINATION"
    FOLLOW_UP = "FOLLOW_UP"
    PAYMENT = "PAYMENT"
    CUSTOM = "CUSTOM"

    EVENT_TYPE_CHOICES = [
        (REMINDER, _("Recordatorio")),
        (RESULT, _("Resultado disponible")),
        (BIRTHDAY, _("Cumpleaños")),
        (VACCINATION, _("Vacuna pendiente")),
        (FOLLOW_UP, _("Seguimiento")),
        (PAYMENT, _("Pago")),
        (CUSTOM, _("Personalizado")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="notification_templates",
        verbose_name=_("practice"),
    )
    name = models.CharField(_("name"), max_length=200)
    subject = models.CharField(_("subject"), max_length=300)
    body = models.TextField(
        _("body"),
        help_text=_("Use {{paciente}}, {{tutor}}, {{fecha}} as variables."),
    )
    event_type = models.CharField(
        _("event type"),
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        default=CUSTOM,
    )
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        db_table = "notification_templates"
        ordering = ["event_type", "name"]
        verbose_name = _("notification template")
        verbose_name_plural = _("notification templates")

    def __str__(self) -> str:
        return f"{self.name} ({self.get_event_type_display()})"


class NotificationPreference(BaseModel):
    """
    Per-user email notification preferences.

    Auto-created on first access via get_or_create in the view layer.
    All channels default to enabled so the user starts with full coverage.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="notification_preferences",
        verbose_name=_("practice"),
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
        verbose_name=_("user"),
    )
    email_appointment_reminder = models.BooleanField(
        _("email appointment reminder"), default=True
    )
    email_appointment_confirmed = models.BooleanField(
        _("email appointment confirmed"), default=True
    )
    email_appointment_cancelled = models.BooleanField(
        _("email appointment cancelled"), default=True
    )
    email_waitlist_available = models.BooleanField(
        _("email waitlist available"), default=True
    )
    email_payment_received = models.BooleanField(
        _("email payment received"), default=True
    )
    reminder_hours_before = models.PositiveIntegerField(
        _("reminder hours before"),
        default=24,
        help_text=_("How many hours before the appointment to send the reminder"),
    )

    class Meta:
        db_table = "notification_preferences"
        verbose_name = _("notification preference")
        verbose_name_plural = _("notification preferences")

    def __str__(self) -> str:
        return f"Preferences for {self.user.email}"
