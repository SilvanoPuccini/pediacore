"""
Profile completion service for tutor (User) records.

Computes an advisory completion score from already-hydrated model attributes.
No DB writes, no additional ORM queries.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.users.models import User


def compute_tutor_completion(user: "User") -> dict:
    """
    Return completion score for a tutor's profile.

    Fields tracked (equal weight, 25% each):
      - first_name: non-blank string after strip()
      - last_name: non-blank string after strip()
      - phone: non-blank string after strip()
      - email_verified_at: non-None (email has been confirmed)

    Note: email_verified_at may be None for users who registered before
    email verification was wired (allauth). This is expected and correct —
    the advisory UI will prompt them to verify.

    Returns:
        {"percentage": int, "missing": [str]}
    """
    checks: list[tuple[str, bool]] = [
        ("first_name", bool(user.first_name.strip())),
        ("last_name", bool(user.last_name.strip())),
        ("phone", bool(user.phone.strip())),
        ("email_verified", user.email_verified_at is not None),
    ]
    missing = [label for label, ok in checks if not ok]
    total = len(checks)
    completed = total - len(missing)
    percentage = round((completed / total) * 100)
    return {"percentage": percentage, "missing": missing}
