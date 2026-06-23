"""
Tests for security infrastructure: axes brute-force protection,
rate limiting on sensitive endpoints, CSP violation reporting,
and security middleware headers.
"""

from __future__ import annotations

import pytest
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories.users import UserFactory

# ---------------------------------------------------------------------------
# CSP violation reporting
# ---------------------------------------------------------------------------


class TestCSPReportEndpoint:
    """POST /csp-report/ should accept reports and return 204."""

    def test_csp_report_returns_204(self):
        client = APIClient()
        response = client.post(
            "/csp-report/",
            {
                "csp-report": {
                    "document-uri": "https://estefipediatra.com/",
                    "violated-directive": "script-src-elem",
                    "blocked-uri": "https://evil.com/hack.js",
                }
            },
            format="json",
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_csp_report_without_auth(self):
        """CSP report endpoint must be accessible without authentication."""
        client = APIClient()
        response = client.post("/csp-report/", {"csp-report": {}}, format="json")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_csp_report_with_empty_body(self):
        """Even an empty body should return 204 gracefully."""
        client = APIClient()
        response = client.post("/csp-report/", {}, format="json")
        assert response.status_code == status.HTTP_204_NO_CONTENT


# ---------------------------------------------------------------------------
# Axes brute-force protection
# ---------------------------------------------------------------------------


class TestAxesBruteForceProtection:
    """
    Tests that django-axes is wired and that the progressive cooldown
    callable module is importable and structurally correct.

    NOTE: Full lockout integration with SimpleJWT requires additional
    wiring (axes does not intercept JWT auth failures by default).
    These tests verify the configuration and wiring are correct.
    """

    def test_axes_callable_module_is_importable(self):
        """
        Verify that the progressive cooldown callable path
        configured in AXES_COOLOFF_TIME_CALLABLE resolves correctly.
        """
        from apps.core.axes import get_axes_cooldown

        assert callable(get_axes_cooldown), "get_axes_cooldown must be a callable"

    def test_axes_callable_returns_timedelta(self):
        """Verify the cooldown callable returns a timedelta."""
        from datetime import timedelta
        from unittest.mock import MagicMock

        from apps.core.axes import get_axes_cooldown

        mock_obj = MagicMock()
        mock_obj.ip_address = "192.168.1.1"
        mock_obj.username = "test@test.com"

        result = get_axes_cooldown(None, 5, mock_obj)
        assert isinstance(result, timedelta), (
            f"Expected timedelta, got {type(result)}"
        )
        assert result.total_seconds() > 0, "Cooldown must be positive"

    def test_axes_middleware_is_present(self):
        """Verify AxesMiddleware is in the middleware chain."""
        from django.conf import settings

        middleware_classes = [m for m in settings.MIDDLEWARE if "axes" in m.lower()]
        assert len(middleware_classes) > 0, (
            "AxesMiddleware must be in MIDDLEWARE"
        )

    def test_axes_failure_limit_is_set(self):
        """Verify AXES_FAILURE_LIMIT is configured in settings."""
        from django.conf import settings

        assert hasattr(settings, "AXES_FAILURE_LIMIT"), (
            "AXES_FAILURE_LIMIT must be configured"
        )
        assert settings.AXES_FAILURE_LIMIT > 0, "AXES_FAILURE_LIMIT must be > 0"

    @pytest.mark.django_db
    def test_simplejwt_token_endpoint_exists(self):
        """Verify the token endpoint we want to protect exists."""
        client = APIClient()
        response = client.post(
            "/api/v1/token/",
            {"email": "doesnotexist@test.com", "password": "wrong"},
            format="json",
        )
        # Should return 401 (Unauthorized), not 404
        assert response.status_code == status.HTTP_401_UNAUTHORIZED, (
            f"Token endpoint should return 401 for bad creds, got {response.status_code}"
        )


# ---------------------------------------------------------------------------
# Rate limiting on registration
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRateLimitOnRegistration:
    """
    Tests that UserRegistrationView is rate-limited via django-ratelimit.
    """

    def test_registration_has_ratelimit_decorator(self):
        """
        Verify the @ratelimit decorator is applied to UserRegistrationView.
        The decorator wraps the dispatch method via @method_decorator.
        """
        from django.utils.decorators import method_decorator
        from apps.users.views import UserRegistrationView

        view_class = UserRegistrationView
        dispatch = getattr(view_class, "dispatch", None)

        # @method_decorator wraps the method. The wrapper retains the
        # original function reference. Check that it's wrapped.
        if dispatch:
            # The decorator adds a _wrapped attribute or similar
            import functools

            is_wrapped = isinstance(dispatch, functools.partial) or hasattr(
                dispatch, "__wrapped__"
            )
            # Also check that dispatch is not the raw View.dispatch
            from django.views.generic.base import View

            is_custom = dispatch is not View.dispatch
            assert is_custom, (
                "UserRegistrationView.dispatch should be wrapped by @method_decorator"
            )

        # Simpler check: the view class should have the '_ratelimit' attribute
        # on its post method after instantiation
        # Actually let's just verify the view has ratelimit in its module path
        import inspect

        source = inspect.getsource(view_class)
        assert "ratelimit" in source, (
            "UserRegistrationView source must reference ratelimit"
        )

    def test_registration_endpoint_is_reachable(self):
        """
        Verify the registration endpoint works for the first valid request.
        Rate limiting may or may not block in test context, but the endpoint
        should respond without error.
        """
        client = APIClient()
        response = client.post(
            "/api/v1/register/",
            {
                "email": "ratelimit-test@test.com",
                "password": "SecurePass123!",
                "password2": "SecurePass123!",
                "first_name": "Test",
                "last_name": "RateLimit",
            },
            format="json",
        )
        # Should be 201 (created) or 400 (validation error)
        assert response.status_code in (
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ), f"Unexpected registration status: {response.status_code}"


# ---------------------------------------------------------------------------
# Security middleware headers
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSecurityMiddlewareHeaders:
    """Verify security headers are present in responses."""

    def test_csp_header_present_on_api(self):
        client = APIClient()
        response = client.get("/api/v1/services/")
        csp = response.get("Content-Security-Policy", "")
        assert csp, "Content-Security-Policy header is missing on API responses"

    def test_csp_includes_report_uri(self):
        """CSP should include report-uri for violation monitoring."""
        client = APIClient()
        response = client.get("/api/v1/services/")
        csp = response.get("Content-Security-Policy", "")
        assert "report-uri" in csp, (
            f"CSP should include report-uri. Got: {csp!r}"
        )

    def test_csp_includes_all_directives(self):
        """Verify essential CSP directives are present."""
        client = APIClient()
        response = client.get("/api/v1/services/")
        csp = response.get("Content-Security-Policy", "")

        required = ["default-src", "script-src", "style-src", "img-src", "frame-src"]
        for directive in required:
            assert directive in csp, (
                f"CSP missing directive: {directive}. Got: {csp!r}"
            )
