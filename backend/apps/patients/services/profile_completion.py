"""
Profile completion service for patient records.

Computes an advisory completion score from already-hydrated model attributes.
No DB writes, no additional ORM queries.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.patients.models import Patient


def compute_patient_completion(patient: "Patient") -> dict:
    """
    Return completion score for a patient's profile.

    Fields tracked (equal weight, 20% each):
      - first_name: always non-blank (required at creation) — always complete
      - last_name: always non-blank (required at creation) — always complete
      - date_of_birth: always set (required at creation) — always complete
      - sex_at_birth: must differ from NO_ESPECIFICA sentinel
      - insurance: non-blank string after strip() (any selected insurance counts)

    A freshly created patient (name + DOB only) scores 60% (3/5 satisfied).
    A fully enriched patient scores 100%.

    Returns:
        {"percentage": int, "missing": [str]}
    """
    checks: list[tuple[str, bool]] = [
        ("first_name", bool(patient.first_name.strip())),
        ("last_name", bool(patient.last_name.strip())),
        ("date_of_birth", patient.date_of_birth is not None),
        ("sex_at_birth", patient.sex_at_birth != "NO_ESPECIFICA"),
        ("insurance", bool(patient.insurance.strip())),
    ]
    missing = [label for label, ok in checks if not ok]
    total = len(checks)
    completed = total - len(missing)
    percentage = round((completed / total) * 100)
    return {"percentage": percentage, "missing": missing}
