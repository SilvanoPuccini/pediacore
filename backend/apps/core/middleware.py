"""
Core middleware for PEDIACORE.
"""

from __future__ import annotations


class ContentSecurityPolicyMiddleware:
    """
    Middleware that adds a Content-Security-Policy header to all responses.

    Uses a relaxed policy for /gestion-9f3a/ (Alpine.js requires unsafe-eval)
    and a strict policy for everything else.
    """

    # Standard CSP for the public site and API
    # NOTE: 'unsafe-inline' intentionally omitted from script-src.
    # The React SPA is served as bundled files and does not require inline scripts.
    CSP_DIRECTIVES = [
        "default-src 'self'",
        "script-src 'self' *.mercadopago.com *.mercadolibre.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "frame-src 'self' *.mercadopago.com *.mercadolibre.com",
        "connect-src 'self' *.mercadopago.com *.mercadolibre.com",
        "font-src 'self' data:",
    ]

    # Admin CSP: adds 'unsafe-eval' for Alpine.js (used by django-unfold)
    # and fonts.googleapis.com / fonts.gstatic.com for Material Symbols
    ADMIN_CSP_DIRECTIVES = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self'",
        "frame-src 'self'",
    ]

    def __init__(self, get_response):
        self.get_response = get_response
        self._csp_value = "; ".join(self.CSP_DIRECTIVES)
        self._admin_csp_value = "; ".join(self.ADMIN_CSP_DIRECTIVES)

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/gestion-9f3a/"):
            response["Content-Security-Policy"] = self._admin_csp_value
        else:
            response["Content-Security-Policy"] = self._csp_value
        return response
