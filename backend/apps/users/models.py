from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for PEDIACORE.

    Uses email as the unique identifier instead of username.
    Supports three roles: VISITOR, TUTOR, and DOCTOR.
    """

    # Role choices
    VISITOR = "VISITOR"
    TUTOR = "TUTOR"
    DOCTOR = "DOCTOR"

    ROLE_CHOICES = [
        (VISITOR, _("Visitor")),
        (TUTOR, _("Tutor")),
        (DOCTOR, _("Doctor")),
    ]

    email = models.EmailField(_("email address"), unique=True)
    first_name = models.CharField(_("first name"), max_length=150, blank=True)
    last_name = models.CharField(_("last name"), max_length=150, blank=True)
    phone = models.CharField(_("phone number"), max_length=30, blank=True)
    role = models.CharField(
        _("role"),
        max_length=20,
        choices=ROLE_CHOICES,
        default=VISITOR,
    )

    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Designates whether this user should be treated as active."),
    )
    is_staff = models.BooleanField(
        _("staff status"),
        default=False,
        help_text=_("Designates whether the user can log into the admin site."),
    )

    email_verified_at = models.DateTimeField(_("email verified at"), null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(_("created at"), default=timezone.now)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)
    deleted_at = models.DateTimeField(_("deleted at"), null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        """Return the user's full name, trimmed of whitespace."""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_email_verified(self) -> bool:
        """Return True if the user has verified their email address."""
        return self.email_verified_at is not None
