"""Diagnostic command for MercadoPago API."""

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

import mercadopago


class Command(BaseCommand):
    help = "Test MercadoPago API connectivity"

    def handle(self, *args, **options):
        token = settings.MERCADOPAGO_ACCESS_TOKEN
        sdk = mercadopago.SDK(token)

        self.stdout.write(f"Token: {token[:15]}...")

        # 1. Payment methods
        r = sdk.payment_methods().list_all()
        self.stdout.write(
            f"\n1. Payment methods: {r.get('status')}"
        )
        for m in r.get("response", []):
            if m.get("id") == "debvisa":
                self.stdout.write(f"   debvisa: {m['name']}")

        # 2. Issuers for debvisa
        url = (
            "https://api.mercadopago.com"
            "/v1/payment_methods/card_issuers"
        )
        resp = requests.get(
            url,
            params={"payment_method_id": "debvisa"},
            headers={
                "Authorization": "Bearer " + token,
            },
            timeout=10,
        )
        self.stdout.write(
            f"\n2. Issuers: {resp.status_code}"
        )
        if resp.ok:
            for i in resp.json():
                self.stdout.write(
                    f"   id={i['id']} {i['name']}"
                )

        # 3. Fake token payment
        r2 = sdk.payment().create({
            "transaction_amount": 100,
            "token": "fake_token",
            "description": "Test",
            "installments": 1,
            "payment_method_id": "debvisa",
            "payer": {"email": "test@test.com"},
        })
        self.stdout.write(
            f"\n3. Fake payment: {r2.get('status')}"
        )
        self.stdout.write(f"   {r2.get('response')}")
