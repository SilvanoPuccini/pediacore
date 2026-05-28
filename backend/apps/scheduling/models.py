from __future__ import annotations

import datetime
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, TimeStampedModel


class Appointment(BaseModel):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

    STATUS_CHOICES = [
        (PENDING, _("Pending")),
        (CONFIRMED, _("Confirmed")),
        (COMPLETED, _("Completed")),
        (CANCELLED, _("Cancelled")),
        (NO_SHOW, _("No Show")),
    ]

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
            .exclude(status=Appointment.CANCELLED)
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
    BOOKED = "BOOKED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (WAITING, _("Waiting")),
        (NOTIFIED, _("Notified")),
        (BOOKED, _("Booked")),
        (EXPIRED, _("Expired")),
        (CANCELLED, _("Cancelled")),
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
    notified_at = models.DateTimeField(_("notified at"), null=True, blank=True)
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
