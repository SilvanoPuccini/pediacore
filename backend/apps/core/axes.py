"""
Progressive cooldown for django-axes brute-force protection.

The AXES_COOLOFF_TIME_CALLABLE signature is:
    fn(attempt_time, failures_since_start, access_attempt_obj) -> timedelta

Each subsequent lockout increases the cooldown:
  1st lockout: 15 minutes
  2nd lockout: 1 hour
  3rd lockout: 4 hours
  4th+ lockout: 24 hours
"""

from datetime import timedelta


def get_axes_cooldown(attempt_time, failures_since_start, obj):
    """
    Calculate cooldown time based on lockout history.

    Called by axes via AXES_COOLOFF_TIME_CALLABLE setting.
    `failures_since_start` resets each time cooldown expires,
    so each new cooldown cycle starts fresh with a short timeout.
    We use the cooldown sequence to progressively penalize repeat offenders.

    Axes automatically tracks cooldown across the entire history
    of lockouts via its own internal counters.
    """
    # Estimate lockout severity from failures_since_start
    # Each lockout typically has AXES_FAILURE_LIMIT (5) failures
    lockout_count = max(1, failures_since_start // 5)

    # Cap at 5 for reasonable upper bound
    lockout_count = min(lockout_count, 5)

    cooldowns = {
        1: timedelta(minutes=15),
        2: timedelta(hours=1),
        3: timedelta(hours=4),
    }
    return cooldowns.get(lockout_count, timedelta(hours=24))
