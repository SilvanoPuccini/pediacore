"""
Models for the practice app.

Manages clinics (Practice), locations/sedes (Location),
services offered (Service), working hours (WorkingHours),
and blocked time slots (BlockedSlot).
"""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel, TimeStampedModel


class Practice(BaseModel):
    """
    The clinic/practice entity.

    There is currently one practice (Dra. Estefanía), but this model
    exists as a FK target for all business models to prepare for SaaS Fase 3.
    """

    name = models.CharField(_("name"), max_length=200)
    slug = models.SlugField(_("slug"), unique=True)
    description = models.TextField(_("description"), blank=True)
    logo = models.ImageField(_("logo"), upload_to="practices/logos/", null=True, blank=True)
    email = models.EmailField(_("email"))
    phone = models.CharField(_("phone"), max_length=30)
    website = models.URLField(_("website"), blank=True)
    is_active = models.BooleanField(_("active"), default=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_practices",
        verbose_name=_("owner"),
    )

    class Meta:
        db_table = "practices"
        ordering = ["-created_at"]
        verbose_name = _("practice")
        verbose_name_plural = _("practices")

    def __str__(self) -> str:
        return self.name


class Location(BaseModel):
    """
    Physical location (sede) where the doctor attends patients.

    Estefanía has two locations: Pucón and Villarrica.
    """

    practice = models.ForeignKey(
        Practice,
        on_delete=models.CASCADE,
        related_name="locations",
        verbose_name=_("practice"),
    )
    name = models.CharField(_("name"), max_length=200)
    slug = models.SlugField(_("slug"))
    address = models.TextField(_("address"))
    city = models.CharField(_("city"), max_length=100)
    region = models.CharField(_("region"), max_length=100, default="Araucanía")
    phone = models.CharField(_("phone"), max_length=30, blank=True)
    email = models.EmailField(_("email"), blank=True)
    latitude = models.DecimalField(
        _("latitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    longitude = models.DecimalField(
        _("longitude"), max_digits=10, decimal_places=7, null=True, blank=True
    )
    display_hours = models.CharField(
        _("display hours"),
        max_length=200,
        blank=True,
        help_text=_("Human-readable hours shown on landing page, e.g. 'Lun – Vie · 09:00 – 19:00'"),
    )
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        db_table = "locations"
        ordering = ["name"]
        unique_together = [("practice", "slug")]
        verbose_name = _("location")
        verbose_name_plural = _("locations")

    def __str__(self) -> str:
        return f"{self.name} ({self.practice.name})"


class Service(BaseModel):
    """
    Service offered by the practice.

    Examples: Consulta General, Control Sano, Urgencia Pediátrica.
    Services can be in-person, online, or both (modality field).
    """

    PRESENCIAL = "PRESENCIAL"
    ONLINE = "ONLINE"
    PRESENCIAL_Y_ONLINE = "PRESENCIAL_Y_ONLINE"

    MODALITY_CHOICES = [
        (PRESENCIAL, _("Solo presencial")),
        (ONLINE, _("Solo online")),
        (PRESENCIAL_Y_ONLINE, _("Presencial y online")),
    ]

    practice = models.ForeignKey(
        Practice,
        on_delete=models.CASCADE,
        related_name="services",
        verbose_name=_("practice"),
    )
    name = models.CharField(_("name"), max_length=200)
    slug = models.SlugField(_("slug"))
    description = models.TextField(_("description"), blank=True)
    duration_minutes = models.PositiveIntegerField(_("duration (minutes)"), default=30)
    price_clp = models.PositiveIntegerField(
        _("price (CLP)"),
        default=0,
        help_text=_("Price in Chilean pesos (whole integer, no decimal)."),
    )
    modality = models.CharField(
        _("modality"),
        max_length=20,
        choices=MODALITY_CHOICES,
        default=PRESENCIAL,
    )
    requires_fonasa_validation = models.BooleanField(
        _("requires Fonasa validation"),
        default=False,
        help_text=_("If True, booking requires Fonasa benefit verification."),
    )
    requires_manual_coordination = models.BooleanField(
        _("requires manual coordination"),
        default=False,
        help_text=_("If True, the service cannot be self-booked; doctor must confirm."),
    )
    display_order = models.PositiveIntegerField(
        _("display order"),
        default=0,
        help_text=_("Controls the display order in booking UI. Lower = shown first."),
    )
    is_active = models.BooleanField(_("active"), default=True)
    locations = models.ManyToManyField(
        Location,
        blank=True,
        related_name="services",
        verbose_name=_("locations"),
    )

    class Meta:
        db_table = "services"
        ordering = ["display_order", "name"]
        unique_together = [("practice", "slug")]
        verbose_name = _("service")
        verbose_name_plural = _("services")

    def __str__(self) -> str:
        return f"{self.name} ({self.practice.name})"

    @property
    def is_online(self) -> bool:
        """Return True if this service is available online (ONLINE or PRESENCIAL_Y_ONLINE)."""
        return self.modality in (self.ONLINE, self.PRESENCIAL_Y_ONLINE)


class WorkingHours(TimeStampedModel):
    """
    Weekly schedule block per location (or for online consultations).

    Multiple blocks per day per location are allowed (e.g. morning + afternoon).
    Online blocks have is_online=True and location=None.
    """

    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6

    DAY_OF_WEEK_CHOICES = [
        (MONDAY, _("Monday")),
        (TUESDAY, _("Tuesday")),
        (WEDNESDAY, _("Wednesday")),
        (THURSDAY, _("Thursday")),
        (FRIDAY, _("Friday")),
        (SATURDAY, _("Saturday")),
        (SUNDAY, _("Sunday")),
    ]

    practice = models.ForeignKey(
        Practice,
        on_delete=models.CASCADE,
        related_name="working_hours",
        verbose_name=_("practice"),
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="working_hours",
        verbose_name=_("location"),
        null=True,
        blank=True,
        help_text=_("Leave blank for online working hours blocks."),
    )
    day_of_week = models.IntegerField(_("day of week"), choices=DAY_OF_WEEK_CHOICES)
    start_time = models.TimeField(_("start time"))
    end_time = models.TimeField(_("end time"))
    break_start = models.TimeField(
        _("break start"),
        null=True,
        blank=True,
        help_text=_("Optional lunch/break window start. Must be within start–end range."),
    )
    break_end = models.TimeField(
        _("break end"),
        null=True,
        blank=True,
        help_text=_("Optional lunch/break window end. Must be within start–end range."),
    )
    max_appointments = models.PositiveIntegerField(
        _("max appointments"),
        default=8,
        help_text=_("Maximum number of bookings allowed within this block."),
    )
    slot_duration_minutes = models.PositiveIntegerField(
        _("slot duration (minutes)"),
        default=45,
        help_text=_("Duration of each time slot in minutes."),
    )
    is_online = models.BooleanField(
        _("online block"),
        default=False,
        help_text=_("If True, this block is for online consultations (location should be left blank)."),
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="dedicated_working_hours",
        verbose_name=_("service"),
        help_text=_("If set, this block only applies to this specific service. "
                     "Leave blank for general blocks that apply to all services."),
    )
    is_active = models.BooleanField(_("active"), default=True)

    class Meta:
        db_table = "working_hours"
        ordering = ["day_of_week", "start_time"]
        verbose_name = _("working hours")
        verbose_name_plural = _("working hours")

    def __str__(self) -> str:
        location_label = self.location.name if self.location else "Online"
        return (
            f"{location_label} — {self.get_day_of_week_display()} "
            f"{self.start_time:%H:%M}–{self.end_time:%H:%M}"
        )

    def clean(self) -> None:
        """Validate time range consistency and break window bounds."""
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError(
                {"end_time": _("End time must be after start time.")}
            )
        if self.break_start or self.break_end:
            if not (self.break_start and self.break_end):
                raise ValidationError(
                    _("Both break_start and break_end must be set together.")
                )
            if self.start_time and self.end_time:
                if self.break_start < self.start_time or self.break_end > self.end_time:
                    raise ValidationError(
                        _("Break window must be within the working hours start–end range.")
                    )
                if self.break_end <= self.break_start:
                    raise ValidationError(
                        {"break_end": _("Break end must be after break start.")}
                    )


class BlockedSlot(TimeStampedModel):
    """
    Blocked time period for a location (or all locations when location is null).

    Used for vacations, public holidays, or any unavailability period.
    When location is null, the block applies to all locations of the practice.
    """

    practice = models.ForeignKey(
        Practice,
        on_delete=models.CASCADE,
        related_name="blocked_slots",
        verbose_name=_("practice"),
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="blocked_slots",
        null=True,
        blank=True,
        verbose_name=_("location"),
        help_text=_("Leave blank to block all locations."),
    )
    start_datetime = models.DateTimeField(_("start datetime"))
    end_datetime = models.DateTimeField(_("end datetime"))
    reason = models.CharField(_("reason"), max_length=200, blank=True)

    class Meta:
        db_table = "blocked_slots"
        ordering = ["start_datetime"]
        verbose_name = _("blocked slot")
        verbose_name_plural = _("blocked slots")

    def __str__(self) -> str:
        location_label = self.location.name if self.location else "All locations"
        return f"{location_label} blocked {self.start_datetime:%Y-%m-%d %H:%M}–{self.end_datetime:%H:%M}"

    def clean(self) -> None:
        """Validate that end_datetime is after start_datetime."""
        if self.start_datetime and self.end_datetime and self.end_datetime <= self.start_datetime:
            raise ValidationError(
                {"end_datetime": _("End datetime must be after start datetime.")}
            )
