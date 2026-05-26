"""
Tests for the WHO Z-score calculation service.

Uses known WHO reference values to verify correctness of the LMS implementation.
"""

from __future__ import annotations

import math

import pytest

from apps.medical_records.services.who_zscore import (
    _lms_z_score,
    _round_to_half,
    _z_to_percentile,
    calculate_who_z_scores,
)


class TestLMSZScore:
    def test_median_value_gives_z_zero(self) -> None:
        """When measurement == M (median), Z-score should be exactly 0."""
        # Using boys weight-for-age at birth: L=0.3487, M=3.3464, S=0.14602
        z = _lms_z_score(3.3464, L=0.3487, M=3.3464, S=0.14602)
        assert z == pytest.approx(0.0, abs=1e-6)

    def test_above_median_gives_positive_z(self) -> None:
        """Weight above the median should produce a positive Z-score."""
        z = _lms_z_score(4.0, L=0.3487, M=3.3464, S=0.14602)
        assert z > 0

    def test_below_median_gives_negative_z(self) -> None:
        """Weight below the median should produce a negative Z-score."""
        z = _lms_z_score(2.5, L=0.3487, M=3.3464, S=0.14602)
        assert z < 0

    def test_l_zero_uses_log_normal(self) -> None:
        """L=1.0 (height-for-age) should use normal formula, not log."""
        # Boys length-for-age at birth: L=1.0, M=49.8842, S=0.03795
        z = _lms_z_score(49.8842, L=1.0, M=49.8842, S=0.03795)
        assert z == pytest.approx(0.0, abs=1e-6)

    def test_extreme_low_clamped_to_minus_6(self) -> None:
        """Extreme low values should be clamped to -6."""
        z = _lms_z_score(0.1, L=0.3487, M=3.3464, S=0.14602)
        assert z == pytest.approx(-6.0, abs=1e-6)

    def test_extreme_high_clamped_to_6(self) -> None:
        """Extreme high values should be clamped to 6."""
        z = _lms_z_score(30.0, L=0.3487, M=3.3464, S=0.14602)
        assert z == pytest.approx(6.0, abs=1e-6)


class TestZToPercentile:
    def test_z_zero_gives_50th_percentile(self) -> None:
        """Z=0 corresponds to the 50th percentile."""
        p = _z_to_percentile(0.0)
        assert p == pytest.approx(50.0, abs=0.1)

    def test_z_positive_gives_above_50th(self) -> None:
        p = _z_to_percentile(1.0)
        assert p > 50.0

    def test_z_negative_gives_below_50th(self) -> None:
        p = _z_to_percentile(-1.0)
        assert p < 50.0

    def test_z_1645_gives_95th_percentile(self) -> None:
        """Z≈1.645 → P95."""
        p = _z_to_percentile(1.645)
        assert p == pytest.approx(95.0, abs=0.2)

    def test_z_minus_1645_gives_5th_percentile(self) -> None:
        """Z≈-1.645 → P5."""
        p = _z_to_percentile(-1.645)
        assert p == pytest.approx(5.0, abs=0.2)

    def test_percentile_range(self) -> None:
        """Percentile must always be in [0, 100]."""
        for z in (-6, -3, -1, 0, 1, 3, 6):
            p = _z_to_percentile(float(z))
            assert 0.0 <= p <= 100.0


class TestRoundToHalf:
    def test_round_exact_half(self) -> None:
        assert _round_to_half(50.5) == 50.5

    def test_round_up_to_half(self) -> None:
        assert _round_to_half(50.4) == 50.5

    def test_round_down_to_half(self) -> None:
        assert _round_to_half(50.1) == 50.0

    def test_round_whole_number(self) -> None:
        assert _round_to_half(60.0) == 60.0


class TestCalculateWhoZScores:
    def test_none_inputs_return_none(self) -> None:
        """All measurements None → all Z-scores and percentiles are None."""
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=6,
            weight_kg=None,
            height_cm=None,
            head_circumference_cm=None,
            bmi=None,
        )
        for key, value in result.items():
            assert value is None, f"Expected None for {key}, got {value}"

    def test_newborn_boys_weight_at_median_z_near_zero(self) -> None:
        """
        Boys at birth, weight = WHO median (3.3464 kg) → weight_for_age_z ≈ 0.
        """
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=0,
            weight_kg=3.3464,
            height_cm=None,
            head_circumference_cm=None,
        )
        assert result["weight_for_age_z"] is not None
        assert abs(result["weight_for_age_z"]) < 0.01

    def test_newborn_boys_weight_at_median_percentile_near_50(self) -> None:
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=0,
            weight_kg=3.3464,
            height_cm=None,
            head_circumference_cm=None,
        )
        assert result["weight_for_age_percentile"] is not None
        assert abs(result["weight_for_age_percentile"] - 50.0) < 1.0

    def test_newborn_girls_weight_at_median_z_near_zero(self) -> None:
        """
        Girls at birth, weight = WHO median (3.2322 kg) → weight_for_age_z ≈ 0.
        """
        result = calculate_who_z_scores(
            patient_sex="F",
            age_in_months=0,
            weight_kg=3.2322,
            height_cm=None,
            head_circumference_cm=None,
        )
        assert result["weight_for_age_z"] is not None
        assert abs(result["weight_for_age_z"]) < 0.01

    def test_height_for_age_boys_at_birth_at_median(self) -> None:
        """Boys at birth, height = WHO median (49.8842 cm) → height_for_age_z ≈ 0."""
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=0,
            weight_kg=None,
            height_cm=49.8842,
            head_circumference_cm=None,
        )
        assert result["height_for_age_z"] is not None
        assert abs(result["height_for_age_z"]) < 0.01

    def test_head_circumference_boys_at_birth_at_median(self) -> None:
        """Boys at birth, HC = WHO median (34.4618 cm) → z ≈ 0."""
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=0,
            weight_kg=None,
            height_cm=None,
            head_circumference_cm=34.4618,
        )
        assert result["head_circumference_for_age_z"] is not None
        assert abs(result["head_circumference_for_age_z"]) < 0.01

    def test_age_out_of_range_returns_none(self) -> None:
        """Age 36 months is not in the 0-24 month table → returns None."""
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=36,
            weight_kg=15.0,
            height_cm=95.0,
            head_circumference_cm=48.0,
        )
        assert result["weight_for_age_z"] is None
        assert result["height_for_age_z"] is None

    def test_invalid_sex_returns_all_none(self) -> None:
        result = calculate_who_z_scores(
            patient_sex="X",
            age_in_months=6,
            weight_kg=7.9,
            height_cm=67.0,
            head_circumference_cm=43.0,
        )
        for value in result.values():
            assert value is None

    def test_weight_for_height_at_known_value(self) -> None:
        """
        Boys, height 70.0 cm, weight = WHO median for that height (9.3998 kg) → Z ≈ 0.
        """
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=12,  # age used only for age-based indicators
            weight_kg=9.3998,
            height_cm=70.0,
            head_circumference_cm=None,
        )
        assert result["weight_for_height_z"] is not None
        assert abs(result["weight_for_height_z"]) < 0.05

    def test_bmi_for_age_at_median(self) -> None:
        """Boys at 12 months, BMI = WHO median (15.4988) → bmi_for_age_z ≈ 0."""
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=12,
            weight_kg=None,
            height_cm=None,
            head_circumference_cm=None,
            bmi=15.4988,
        )
        assert result["bmi_for_age_z"] is not None
        assert abs(result["bmi_for_age_z"]) < 0.05

    def test_result_dict_has_all_expected_keys(self) -> None:
        result = calculate_who_z_scores(
            patient_sex="M",
            age_in_months=0,
            weight_kg=3.3,
            height_cm=50.0,
            head_circumference_cm=34.5,
        )
        expected_keys = {
            "weight_for_age_z",
            "weight_for_age_percentile",
            "height_for_age_z",
            "height_for_age_percentile",
            "head_circumference_for_age_z",
            "head_circumference_for_age_percentile",
            "bmi_for_age_z",
            "bmi_for_age_percentile",
            "weight_for_height_z",
            "weight_for_height_percentile",
        }
        assert set(result.keys()) == expected_keys
