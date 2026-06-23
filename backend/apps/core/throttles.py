"""
Custom throttles for brute-force protection.

SimpleJWT's TokenObtainPairView bypasses django-axes because it does NOT call
django.contrib.auth.authenticate() — it uses its own internal auth path.
This throttle ensures the /api/v1/token/ endpoint is rate-limited regardless.
"""

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """
    Strict per-IP throttle for authentication endpoints.

    Applied to TokenObtainPairView to prevent brute-force password guessing.
    Rate is configured via REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['login'].
    """

    scope = "login"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
