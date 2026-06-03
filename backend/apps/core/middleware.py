"""
Core middleware for PEDIACORE.
"""

from __future__ import annotations


class ContentSecurityPolicyMiddleware:
    """
    Middleware that adds a Content-Security-Policy header to all responses.

    Configured to allow MercadoPago Wallet Brick iframes and scripts.
    """

    # Directives that allow MercadoPago Wallet Brick to function:
    # - frame-src: Wallet Brick renders in an iframe from mercadopago.com / mercadolibre.com
    # - script-src: The Brick SDK loads scripts from mercadopago.com
    CSP_DIRECTIVES = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' *.mercadopago.com *.mercadolibre.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "frame-src 'self' *.mercadopago.com *.mercadolibre.com",
        "connect-src 'self' *.mercadopago.com *.mercadolibre.com",
        "font-src 'self' data:",
    ]

    def __init__(self, get_response):
        self.get_response = get_response
        self._csp_value = "; ".join(self.CSP_DIRECTIVES)

    def __call__(self, request):
        response = self.get_response(request)
        response["Content-Security-Policy"] = self._csp_value
        return response
