"""
TDD tests for CSP middleware (T-02: Wallet Brick CSP headers).

RED → GREEN cycle:
  - Tests verify that responses include correct Content-Security-Policy headers
    allowing MercadoPago Wallet Brick iframes and scripts.
"""

from __future__ import annotations

import pytest
from django.test import RequestFactory
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestCSPMercadoPagoHeaders:
    def test_csp_frame_src_includes_mercadopago(self):
        """
        RED → GREEN: any API response must include frame-src with MercadoPago domains
        in the Content-Security-Policy header.
        """
        client = APIClient()
        response = client.get("/api/v1/services/")

        csp = response.get("Content-Security-Policy", "")
        assert csp, "Content-Security-Policy header is missing"
        assert "mercadopago.com" in csp, f"frame-src must include mercadopago.com. Got: {csp!r}"

    def test_csp_script_src_includes_mercadopago(self):
        """
        RED → GREEN: Content-Security-Policy must allow scripts from MercadoPago.
        """
        client = APIClient()
        response = client.get("/api/v1/services/")

        csp = response.get("Content-Security-Policy", "")
        assert csp, "Content-Security-Policy header is missing"
        # script-src should allow *.mercadopago.com
        assert "script-src" in csp, f"CSP must have script-src directive. Got: {csp!r}"
        assert "mercadopago.com" in csp, f"script-src must include mercadopago.com. Got: {csp!r}"

    def test_csp_frame_src_includes_mercadolibre(self):
        """
        RED → GREEN: frame-src must also include mercadolibre.com (MP CDN).
        """
        client = APIClient()
        response = client.get("/api/v1/services/")

        csp = response.get("Content-Security-Policy", "")
        assert "mercadolibre.com" in csp, f"frame-src must include mercadolibre.com. Got: {csp!r}"
