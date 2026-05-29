"""
Tests for core.validators — Chilean RUT validation.

T-RUT-01 through T-RUT-10 as required by the spec.
"""

from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError

from apps.core.validators import validate_rut


class TestValidateRut:
    """Test cases for the validate_rut() function (T-RUT-01 through T-RUT-10)."""

    # ── Valid RUTs ──────────────────────────────────────────────────────────────

    def test_rut_01_valid_formatted(self) -> None:
        """T-RUT-01: Valid RUT with dots and dash returns canonical form."""
        # RUT 12345678-5 — valid check digit verified via modulo-11
        result = validate_rut("12.345.678-5")
        assert result == "12345678-5"

    def test_rut_02_valid_unformatted(self) -> None:
        """T-RUT-02: Valid RUT without dots, with dash returns same canonical form."""
        result = validate_rut("12345678-5")
        assert result == "12345678-5"

    def test_rut_03_valid_k_uppercase(self) -> None:
        """T-RUT-03: Valid RUT with uppercase K check digit."""
        # RUT 1000005-K: body=1000005, check digit = K (verified via modulo-11)
        result = validate_rut("1.000.005-K")
        assert result == "1000005-K"

    def test_rut_04_valid_k_lowercase_normalized(self) -> None:
        """T-RUT-04: Lowercase k is normalized to uppercase K."""
        result = validate_rut("1.000.005-k")
        assert result == "1000005-K"

    def test_rut_10_single_digit_body(self) -> None:
        """T-RUT-10: Single-digit body RUT — valid if check digit matches."""
        # RUT 1-9: body=1, check = 11 - (1*2 % 11) = 11 - 2 = 9 → "9"
        result = validate_rut("1-9")
        assert result == "1-9"

    # ── Invalid RUTs ────────────────────────────────────────────────────────────

    def test_rut_05_wrong_check_digit(self) -> None:
        """T-RUT-05: Known-invalid check digit raises ValidationError."""
        # 12345678 has check digit 5, so using 0 makes it invalid
        with pytest.raises(ValidationError):
            validate_rut("12.345.678-0")

    def test_rut_06_non_numeric_body(self) -> None:
        """T-RUT-06: Non-numeric body raises ValidationError."""
        with pytest.raises(ValidationError):
            validate_rut("ABC-1")

    def test_rut_07_empty_string(self) -> None:
        """T-RUT-07: Empty string raises ValidationError."""
        with pytest.raises(ValidationError):
            validate_rut("")

    def test_rut_08_no_dash(self) -> None:
        """T-RUT-08: String without a dash raises ValidationError."""
        with pytest.raises(ValidationError):
            validate_rut("1234567")

    def test_rut_09_zero_body(self) -> None:
        """T-RUT-09: Body of zero is invalid."""
        with pytest.raises(ValidationError):
            validate_rut("0-0")

    # ── Additional edge cases ───────────────────────────────────────────────────

    def test_whitespace_stripped(self) -> None:
        """Leading/trailing whitespace is stripped before validation."""
        result = validate_rut("  12345678-5  ")
        assert result == "12345678-5"

    def test_multiple_dashes_rejected(self) -> None:
        """Extra dashes in the RUT raise ValidationError."""
        with pytest.raises(ValidationError):
            validate_rut("12345678-9-extra")

    def test_only_whitespace_raises(self) -> None:
        """String with only whitespace raises ValidationError."""
        with pytest.raises(ValidationError):
            validate_rut("   ")

    def test_returns_string_not_none(self) -> None:
        """validate_rut always returns a non-empty string on success."""
        result = validate_rut("1000005-K")
        assert isinstance(result, str)
        assert len(result) > 0
