from __future__ import annotations

import datetime
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, TimeStampedModel


class Appointment(BaseModel):
    HOLD = "HOLD"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    NO_SHOW = "NO_SHOW"
    RESCHEDULED = "RESCHEDULED"

    STATUS_CHOICES = [
        (HOLD, _("Hold (pending payment)")),
        (PENDING, _("Pending")),
        (CONFIRMED, _("Confirmed")),
        (CHECKED_IN, _("Checked in")),
        (IN_PROGRESS, _("In progress")),
        (COMPLETED, _("Completed")),
        (CANCELLED, _("Cancelled")),
        (EXPIRED, _("Expired")),
        (NO_SHOW, _("No Show")),
        (RESCHEDULED, _("Rescheduled")),
    ]

    # Statuses that occupy a slot (block availability)
    SLOT_BLOCKING_STATUSES = [HOLD, PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED]
    # Statuses that free a slot
    SLOT_FREE_STATUSES = [CANCELLED, EXPIRED, NO_SHOW, RESCHEDULED]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name=_("practice"),
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name=_("patient"),
    )
    service = models.ForeignKey(
        "practice.Service",
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name=_("service"),
    )
    location = models.ForeignKey(
        "practice.Location",
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name=_("location"),
        null=True,
        blank=True,
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="appointments",
        verbose_name=_("doctor"),
    )
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booked_appointments",
        verbose_name=_("booked by"),
    )
    scheduled_date = models.DateField(_("scheduled date"))
    start_time = models.TimeField(_("start time"))
    end_time = models.TimeField(_("end time"))
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
    )
    is_online = models.BooleanField(_("online appointment"), default=False)
    cancellation_reason = models.TextField(_("cancellation reason"), blank=True)
    cancelled_at = models.DateTimeField(_("cancelled at"), null=True, blank=True)
    confirmed_at = models.DateTimeField(_("confirmed at"), null=True, blank=True)
    reminder_sent_at = models.DateTimeField(_("reminder sent at"), null=True, blank=True)
    notes = models.TextField(_("notes"), blank=True)

    # ── Hold / payment flow ──────────────────────────────────────────────────
    hold_expires_at = models.DateTimeField(
        _("hold expires at"), null=True, blank=True,
        help_text=_("When the HOLD reservation expires if payment is not completed."),
    )
    WHATSAPP = "WHATSAPP"
    ZOOM = "ZOOM"

    CALL_PLATFORM_CHOICES = [
        (WHATSAPP, _("WhatsApp")),
        (ZOOM, _("Zoom")),
    ]

    call_platform = models.CharField(
        _("call platform"),
        max_length=20,
        choices=CALL_PLATFORM_CHOICES,
        blank=True,
        help_text=_("Platform for online consultations (WhatsApp or Zoom)."),
    )
    meeting_link = models.URLField(
        _("meeting link"), blank=True,
        help_text=_("Video call link for online appointments (auto-generated for Zoom)."),
    )

    # ── Attendance confirmation ──────────────────────────────────────────────
    attendance_confirmed = models.BooleanField(_("attendance confirmed"), default=False)
    attendance_confirmed_at = models.DateTimeField(
        _("attendance confirmed at"), null=True, blank=True,
    )
    CONFIRMATION_VIA_CHOICES = [
        ("EMAIL", _("Email")),
        ("WHATSAPP", _("WhatsApp")),
        ("PORTAL", _("Portal")),
    ]
    attendance_confirmed_via = models.CharField(
        _("confirmed via"), max_length=20,
        choices=CONFIRMATION_VIA_CHOICES, blank=True,
    )

    # ── Reminders ────────────────────────────────────────────────────────────
    reminder_24h_sent = models.BooleanField(_("24h reminder sent"), default=False)
    reminder_2h_sent = models.BooleanField(_("2h reminder sent"), default=False)

    # ── Rescheduling ─────────────────────────────────────────────────────────
    rescheduled_from = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reschedules", verbose_name=_("rescheduled from"),
    )
    rescheduled_at = models.DateTimeField(_("rescheduled at"), null=True, blank=True)

    class Meta:
        db_table = "appointments"
        ordering = ["scheduled_date", "start_time"]
        verbose_name = _("appointment")
        verbose_name_plural = _("appointments")

    def __str__(self) -> str:
        return (
            f"{self.patient} — {self.scheduled_date} {self.start_time:%H:%M} "
            f"({self.get_status_display()})"
        )

    def save(self, *args, **kwargs) -> None:
        if self.start_time and self.service_id:
            try:
                service = self.service
                delta = datetime.timedelta(minutes=service.duration_minutes)
                start_dt = datetime.datetime.combine(datetime.date.today(), self.start_time)
                end_dt = start_dt + delta
                self.end_time = end_dt.time()
            except Exception:
                pass
        super().save(*args, **kwargs)

    def clean(self) -> None:
        if not self.start_time or not self.scheduled_date or not self.location_id:
            return

        overlapping = (
            Appointment.objects.exclude(pk=self.pk)
            .exclude(status__in=Appointment.SLOT_FREE_STATUSES)
            .filter(
                location=self.location_id,
                scheduled_date=self.scheduled_date,
            )
        )

        if self.end_time:
            overlapping = overlapping.filter(
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )

        if overlapping.exists():
            raise ValidationError(
                _("There is already an appointment scheduled at this time and location.")
            )


class WaitlistEntry(BaseModel):
    WAITING = "WAITING"
    NOTIFIED = "NOTIFIED"
    OFFERED = "OFFERED"
    BOOKED = "BOOKED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (WAITING, _("Waiting")),
        (NOTIFIED, _("Notified")),
        (OFFERED, _("Offered — pending confirmation")),
        (BOOKED, _("Booked")),
        (EXPIRED, _("Expired")),
        (CANCELLED, _("Cancelled")),
    ]

    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"

    PRIORITY_CHOICES = [
        (HIGH, _("High")),
        (NORMAL, _("Normal")),
        (LOW, _("Low")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        verbose_name=_("practice"),
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        verbose_name=_("patient"),
    )
    service = models.ForeignKey(
        "practice.Service",
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        verbose_name=_("service"),
    )
    location = models.ForeignKey(
        "practice.Location",
        on_delete=models.CASCADE,
        related_name="waitlist_entries",
        null=True,
        blank=True,
        verbose_name=_("location"),
        help_text=_("Leave blank for any location."),
    )
    preferred_date_start = models.DateField(_("preferred date start"))
    preferred_date_end = models.DateField(_("preferred date end"), null=True, blank=True)
    preferred_time_start = models.TimeField(_("preferred time start"), null=True, blank=True)
    preferred_time_end = models.TimeField(_("preferred time end"), null=True, blank=True)
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default=WAITING,
    )
    priority = models.CharField(
        _("priority"),
        max_length=10,
        choices=PRIORITY_CHOICES,
        default=NORMAL,
    )
    notified_at = models.DateTimeField(_("notified at"), null=True, blank=True)
    offer_expires_at = models.DateTimeField(_("offer expires at"), null=True, blank=True)
    offered_appointment = models.ForeignKey(
        "scheduling.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="waitlist_offer",
        verbose_name=_("offered appointment"),
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        db_table = "waitlist_entries"
        ordering = ["created_at"]
        verbose_name = _("waitlist entry")
        verbose_name_plural = _("waitlist entries")

    def __str__(self) -> str:
        return f"{self.patient} — {self.service} ({self.get_status_display()})"


class CancellationPolicy(BaseModel):
    practice = models.OneToOneField(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="cancellation_policy",
        verbose_name=_("practice"),
    )
    is_active = models.BooleanField(_("active"), default=True)
    description = models.TextField(_("description"), blank=True)

    class Meta:
        db_table = "cancellation_policies"
        verbose_name = _("cancellation policy")
        verbose_name_plural = _("cancellation policies")

    def __str__(self) -> str:
        return f"Cancellation Policy — {self.practice.name}"


class CancellationTier(TimeStampedModel):
    policy = models.ForeignKey(
        CancellationPolicy,
        on_delete=models.CASCADE,
        related_name="tiers",
        verbose_name=_("policy"),
    )
    min_hours_before = models.PositiveIntegerField(
        _("minimum hours before"),
        help_text=_("Minimum hours before appointment for this tier to apply."),
    )
    penalty_percentage = models.DecimalField(
        _("penalty percentage"),
        max_digits=5,
        decimal_places=2,
        help_text=_("0.00 to 100.00"),
    )
    description = models.CharField(_("description"), max_length=200)

    class Meta:
        db_table = "cancellation_tiers"
        ordering = ["-min_hours_before"]
        verbose_name = _("cancellation tier")
        verbose_name_plural = _("cancellation tiers")

    def __str__(self) -> str:
        return f"{self.description} — {self.penalty_percentage}% penalty"


class AppointmentToken(TimeStampedModel):
    """
    Single-use token that allows a tutor to perform an action on their appointment
    via a secure email link, without requiring authentication.

    Inherits TimeStampedModel (no soft-delete — tokens are ephemeral).
    Revocation is handled via used_at timestamp.
    """

    CONFIRM = "CONFIRM"
    CANCEL = "CANCEL"
    RESCHEDULE = "RESCHEDULE"

    ACTION_CHOICES = [
        (CONFIRM, _("Confirm attendance")),
        (CANCEL, _("Cancel appointment")),
        (RESCHEDULE, _("Reschedule appointment")),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="appointment_tokens",
        verbose_name=_("practice"),
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="tokens",
        verbose_name=_("appointment"),
    )
    token = models.CharField(
        _("token"),
        max_length=64,
        unique=True,
        db_index=True,
    )
    action = models.CharField(
        _("action"),
        max_length=20,
        choices=ACTION_CHOICES,
    )
    expires_at = models.DateTimeField(_("expires at"))
    used_at = models.DateTimeField(_("used at"), null=True, blank=True)

    class Meta:
        db_table = "appointment_tokens"
        verbose_name = _("appointment token")
        verbose_name_plural = _("appointment tokens")

    def __str__(self) -> str:
        return f"Token [{self.action}] for Appointment #{self.appointment_id}"

    @property
    def is_expired(self) -> bool:
        """Return True if the token has passed its expiry datetime."""
        return self.expires_at < datetime.datetime.now(tz=self.expires_at.tzinfo)

    @property
    def is_used(self) -> bool:
        """Return True if the token has been consumed."""
        return self.used_at is not None


class AutoResponderConfig(BaseModel):
    practice = models.OneToOneField(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="auto_responder",
        verbose_name=_("practice"),
    )
    is_active = models.BooleanField(_("active"), default=False)
    outside_hours_message = models.TextField(
        _("outside hours message"),
        blank=True,
        help_text=_("Message sent when booking outside working hours"),
    )
    holiday_message = models.TextField(
        _("holiday message"),
        blank=True,
        help_text=_("Message sent during holidays/blocked days"),
    )

    class Meta:
        db_table = "auto_responder_configs"
        verbose_name = _("auto responder config")
        verbose_name_plural = _("auto responder configs")

    def __str__(self) -> str:
        status = "active" if self.is_active else "inactive"
        return f"Auto Responder ({status}) — {self.practice.name}"
