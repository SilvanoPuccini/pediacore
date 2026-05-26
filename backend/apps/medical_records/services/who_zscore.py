"""
WHO Z-score and percentile calculation service for pediatric growth data.

Uses the LMS (Lambda-Mu-Sigma) method with WHO 2006 Child Growth Standards.

LMS formula:
  if L != 0: z = ((measurement / M) ** L - 1) / (L * S)
  if L == 0: z = ln(measurement / M) / S

Reference:
  WHO Multicentre Growth Reference Study Group (2006).
  WHO Child Growth Standards based on length/height, weight and age.
  Acta Paediatrica, 450, 76–85.
"""

from __future__ import annotations

import math
from typing import Optional

from apps.medical_records.services.who_tables import (
    WHO_BMI_FOR_AGE,
    WHO_HEAD_CIRCUMFERENCE_FOR_AGE,
    WHO_HEIGHT_FOR_AGE,
    WHO_WEIGHT_FOR_AGE,
    WHO_WEIGHT_FOR_HEIGHT,
)


# ---------------------------------------------------------------------------
# Core LMS calculation
# ---------------------------------------------------------------------------


def _lms_z_score(measurement: float, L: float, M: float, S: float) -> float:
    """
    Calculate a Z-score using the LMS (Box-Cox) method.

    Args:
        measurement: Observed value (e.g., weight in kg).
        L: Box-Cox power transformation.
        M: Median of the reference population.
        S: Coefficient of variation.

    Returns:
        Z-score (float). Clamped to [-6, 6] to handle biological extremes.
    """
    if M <= 0 or S <= 0:
        raise ValueError(f"M and S must be positive. Got M={M}, S={S}")

    if abs(L) < 1e-9:  # L ≈ 0: log-normal distribution
        z = math.log(measurement / M) / S
    else:
        z = ((measurement / M) ** L - 1.0) / (L * S)

    # WHO recommends clamping extreme Z-scores
    return max(-6.0, min(6.0, z))


# ---------------------------------------------------------------------------
# Percentile via normal CDF
# ---------------------------------------------------------------------------


def _z_to_percentile(z: float) -> float:
    """
    Convert a Z-score to a percentile (0–100) using the normal CDF.

    Uses scipy if available for higher precision; falls back to math.erf
    approximation which is accurate to ~7 decimal places.
    """
    try:
        from scipy.stats import norm  # type: ignore[import]

        return float(norm.cdf(z) * 100.0)
    except ImportError:
        # erf-based approximation: CDF(z) = 0.5 * (1 + erf(z / sqrt(2)))
        return float(0.5 * (1.0 + math.erf(z / math.sqrt(2.0))) * 100.0)


# ---------------------------------------------------------------------------
# Height rounding helper for weight-for-height lookup
# ---------------------------------------------------------------------------


def _round_to_half(value: float) -> float:
    """Round a value to the nearest 0.5 (used for weight-for-height lookup)."""
    return round(value * 2.0) / 2.0


# ---------------------------------------------------------------------------
# Public service function
# ---------------------------------------------------------------------------


def calculate_who_z_scores(
    patient_sex: str,
    age_in_months: int,
    weight_kg: Optional[float] = None,
    height_cm: Optional[float] = None,
    head_circumference_cm: Optional[float] = None,
    bmi: Optional[float] = None,
) -> dict[str, Optional[float]]:
    """
    Calculate WHO Z-scores and percentiles for pediatric growth indicators.

    Supported indicators:
    - weight_for_age      (0–24 months)
    - height_for_age      (0–24 months)
    - head_circumference_for_age  (0–24 months)
    - bmi_for_age         (0–24 months)
    - weight_for_height   (height 45.0–110.0 cm, 0.5-step)

    Args:
        patient_sex: "M" for male, "F" for female.
        age_in_months: Patient age in completed months (integer).
        weight_kg: Weight in kilograms (optional).
        height_cm: Length/height in centimetres (optional).
        head_circumference_cm: Head circumference in centimetres (optional).
        bmi: Body mass index kg/m² (optional; pre-calculated by caller).

    Returns:
        dict with keys:
          weight_for_age_z, weight_for_age_percentile,
          height_for_age_z, height_for_age_percentile,
          head_circumference_for_age_z, head_circumference_for_age_percentile,
          bmi_for_age_z, bmi_for_age_percentile,
          weight_for_height_z, weight_for_height_percentile.
        Each value is float or None when data is unavailable.
    """
    result: dict[str, Optional[float]] = {
        "weight_for_age_z": None,
        "weight_for_age_percentile": None,
        "height_for_age_z": None,
        "height_for_age_percentile": None,
        "head_circumference_for_age_z": None,
        "head_circumference_for_age_percentile": None,
        "bmi_for_age_z": None,
        "bmi_for_age_percentile": None,
        "weight_for_height_z": None,
        "weight_for_height_percentile": None,
    }

    sex = patient_sex.upper()
    if sex not in ("M", "F"):
        return result

    age = int(age_in_months)

    # ------------------------------------------------------------------
    # Weight-for-age
    # ------------------------------------------------------------------
    if weight_kg is not None and weight_kg > 0:
        lms = WHO_WEIGHT_FOR_AGE.get((sex, age))
        if lms is not None:
            L, M, S = lms
            z = _lms_z_score(weight_kg, L, M, S)
            result["weight_for_age_z"] = z
            result["weight_for_age_percentile"] = _z_to_percentile(z)

    # ------------------------------------------------------------------
    # Height/length-for-age
    # ------------------------------------------------------------------
    if height_cm is not None and height_cm > 0:
        lms = WHO_HEIGHT_FOR_AGE.get((sex, age))
        if lms is not None:
            L, M, S = lms
            z = _lms_z_score(height_cm, L, M, S)
            result["height_for_age_z"] = z
            result["height_for_age_percentile"] = _z_to_percentile(z)

    # ------------------------------------------------------------------
    # Head circumference-for-age
    # ------------------------------------------------------------------
    if head_circumference_cm is not None and head_circumference_cm > 0:
        lms = WHO_HEAD_CIRCUMFERENCE_FOR_AGE.get((sex, age))
        if lms is not None:
            L, M, S = lms
            z = _lms_z_score(head_circumference_cm, L, M, S)
            result["head_circumference_for_age_z"] = z
            result["head_circumference_for_age_percentile"] = _z_to_percentile(z)

    # ------------------------------------------------------------------
    # BMI-for-age
    # ------------------------------------------------------------------
    if bmi is not None and bmi > 0:
        lms = WHO_BMI_FOR_AGE.get((sex, age))
        if lms is not None:
            L, M, S = lms
            z = _lms_z_score(bmi, L, M, S)
            result["bmi_for_age_z"] = z
            result["bmi_for_age_percentile"] = _z_to_percentile(z)

    # ------------------------------------------------------------------
    # Weight-for-height (uses height as key, not age)
    # ------------------------------------------------------------------
    if weight_kg is not None and weight_kg > 0 and height_cm is not None and height_cm > 0:
        height_key = _round_to_half(height_cm)
        lms = WHO_WEIGHT_FOR_HEIGHT.get((sex, height_key))
        if lms is not None:
            L, M, S = lms
            z = _lms_z_score(weight_kg, L, M, S)
            result["weight_for_height_z"] = z
            result["weight_for_height_percentile"] = _z_to_percentile(z)

    return result
