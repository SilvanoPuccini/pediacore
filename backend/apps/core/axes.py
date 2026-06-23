"""
Progressive cooldown for django-axes brute-force protection.

The AXES_COOLOFF_TIME_CALLABLE signature is:
    fn(attempt_time, failures_since_start, access_attempt_obj) -> timedelta

Each subsequent lockout increases the cooldown:
  1st lockout: 15 minutes
  2nd lockout: 1 hour
  3rd lockout: 4 hours
  4th+ lockout: 24 hours

Uses a cache counter per IP to track lockout history across cooldown resets,
since failures_since_start only counts failures in the current cycle.
"""

from datetime import timedelta

from django.core.cache import cache

# Cache key TTL: 48 hours — resets if no failed attempts for 2 days
_LOCKOUT_COUNTER_TTL = 48 * 3600

COOLDOWN_TIERS = {
    1: timedelta(minutes=15),
    2: timedelta(hours=1),
    3: timedelta(hours=4),
}
DEFAULT_COOLDOWN = timedelta(hours=24)


def get_axes_cooldown(attempt_time, failures_since_start, obj):
    """
    Calculate cooldown time based on cumulative lockout history.

    Called by axes via AXES_COOLOFF_TIME_CALLABLE setting.

    Uses a cache counter keyed by IP to track how many times this IP
    has been locked out. The counter persists across cooldown resets
    (TTL = 48h) so escalation actually works.
    """
    ip = getattr(obj, "ip_address", None) or "unknown"
    cache_key = f"axes_lockout_count:{ip}"

    lockout_count = cache.get(cache_key, 0) + 1
    cache.set(cache_key, lockout_count, timeout=_LOCKOUT_COUNTER_TTL)

    return COOLDOWN_TIERS.get(lockout_count, DEFAULT_COOLDOWN)
