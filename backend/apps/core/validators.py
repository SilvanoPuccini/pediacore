"""
Chilean RUT (Rol Único Tributario) validator.

Provides a reusable pure function and a Django-compatible validator wrapper.

Usage:
    from apps.core.validators import validate_rut, RutValidator

    # As a Django validator on a model field:
    rut = models.CharField(validators=[validate_rut])

    # As a pure function (returns cleaned RUT or raises ValidationError):
    cleaned = validate_rut("12.345.678-5")  # → "12345678-5"
"""

from __future__ import annotations

from itertools import cycle

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def clean_rut(value: str) -> str:
    """
    Normalize a RUT string to canonical form: ``"XXXXXXXX-D"`` (no dots, one dash).

    Does NOT validate the check digit — use :func:`validate_rut` for full validation.
    """
    stripped = value.strip()
    # Remove dots
    stripped = stripped.replace(".", "")
    # Uppercase (normalizes k → K)
    stripped = stripped.upper()
    return stripped


def validate_rut_checksum(cleaned: str) -> bool:
    """
    Return True if *cleaned* RUT (format ``"XXXXXXXX-D"``) has a valid check digit.

    Expects the input to already be in canonical form (no dots, uppercase).
    Does NOT raise — returns bool.
    """
    if "-" not in cleaned:
        return False

    parts = cleaned.split("-")
    if len(parts) != 2:
        return False

    body, check_digit = parts

    if not body or not body.isdigit():
        return False

    if len(check_digit) != 1:
        return False

    # Body zero is invalid
    if int(body) == 0:
        return False

    # Compute expected check digit using modulo-11 algorithm
    factors = cycle(range(2, 8))
    total = sum(int(digit) * factor for digit, factor in zip(reversed(body), factors))
    remainder = total % 11
    diff = 11 - remainder

    if diff == 11:
        expected = "0"
    elif diff == 10:
        expected = "K"
    else:
        expected = str(diff)

    return check_digit == expected


def validate_rut(value: str) -> str:
    """
    Validate a Chilean RUT and return the canonical ``"XXXXXXXX-D"`` form.

    Accepts dots and lowercase k:
    - ``"12.345.678-5"``  → ``"12345678-5"``
    - ``"7.573.855-k"``   → ``"7573855-K"``

    Raises :exc:`django.core.exceptions.ValidationError` if:
    - *value* is empty
    - the format is not ``"body-check"`` (exactly one dash)
    - the body is not numeric
    - the body is zero
    - the check digit does not match

    Returns the cleaned canonical RUT string on success.
    """
    if not value or not value.strip():
        raise ValidationError(_("RUT is required."))

    cleaned = clean_rut(value)

    if "-" not in cleaned:
        raise ValidationError(
            _("Invalid RUT format. Expected format: 12345678-9 or 12.345.678-9.")
        )

    parts = cleaned.split("-")
    if len(parts) != 2:
        raise ValidationError(
            _("Invalid RUT format. Expected format: 12345678-9 or 12.345.678-9.")
        )

    body, check_digit = parts

    if not body or not body.isdigit():
        raise ValidationError(
            _("RUT body must be numeric (digits only).")
        )

    if int(body) == 0:
        raise ValidationError(_("RUT body cannot be zero."))

    if len(check_digit) != 1:
        raise ValidationError(
            _("Invalid RUT check digit. Must be a single digit or 'K'.")
        )

    if not validate_rut_checksum(cleaned):
        raise ValidationError(
            _("Invalid RUT check digit. Please verify the RUT number.")
        )

    return cleaned


class RutValidator:
    """
    Django field validator that wraps :func:`validate_rut`.

    Can be attached directly to a model field's ``validators`` list.
    Unlike the standalone :func:`validate_rut`, this validator is a callable
    class suitable for ``validators=[RutValidator()]`` on model fields.
    """

    def __call__(self, value: str) -> None:
        validate_rut(value)

    def __eq__(self, other: object) -> bool:
        return isinstance(other, RutValidator)
