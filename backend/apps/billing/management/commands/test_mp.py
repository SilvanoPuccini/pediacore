"""Diagnostic command for MercadoPago credential verification."""

import os

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

import mercadopago


class Command(BaseCommand):
    help = "Verify MercadoPago credentials match (public key + access token from same app)"

    def handle(self, *args, **options):
        access_token = settings.MERCADOPAGO_ACCESS_TOKEN
        public_key = os.environ.get("VITE_MP_PUBLIC_KEY", "NOT SET")

        self.stdout.write("=" * 60)
        self.stdout.write("MERCADOPAGO CREDENTIAL DIAGNOSTIC")
        self.stdout.write("=" * 60)

        self.stdout.write(f"\nAccess Token: {access_token[:20]}...{access_token[-10:]}")
        self.stdout.write(f"Public Key:   {public_key}")

        # 1. Get backend collector_id from access token
        self.stdout.write("\n--- 1. Backend collector (from /users/me) ---")
        try:
            me_resp = requests.get(
                "https://api.mercadopago.com/users/me",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            if me_resp.ok:
                me_data = me_resp.json()
                backend_collector = me_data.get("id")
                self.stdout.write(f"   collector_id: {backend_collector}")
                self.stdout.write(f"   nickname: {me_data.get('nickname', '?')}")
                self.stdout.write(f"   email: {me_data.get('email', '?')}")
            else:
                self.stdout.write(f"   ERROR: {me_resp.status_code} {me_resp.text[:200]}")
                backend_collector = None
        except Exception as e:
            self.stdout.write(f"   ERROR: {e}")
            backend_collector = None

        # 2. Resolve public key owner via MP API
        self.stdout.write("\n--- 2. Public key owner (from credentials wrapper) ---")
        frontend_collector = None
        if public_key != "NOT SET":
            try:
                pk_resp = requests.get(
                    "https://api.mercadopago.com/plugins-credentials-wrapper/credentials",
                    params={"public_key": public_key},
                    timeout=10,
                )
                if pk_resp.ok:
                    pk_data = pk_resp.json()
                    frontend_collector = pk_data.get("client_id") or pk_data.get("user_id")
                    self.stdout.write(f"   Response: {pk_data}")
                else:
                    self.stdout.write(f"   Wrapper returned: {pk_resp.status_code}")
                    # Fallback: try payment_methods with public_key
                    pm_resp = requests.get(
                        "https://api.mercadopago.com/v1/payment_methods",
                        params={"public_key": public_key},
                        timeout=10,
                    )
                    self.stdout.write(f"   Payment methods with public_key: {pm_resp.status_code}")
                    if not pm_resp.ok:
                        self.stdout.write(f"   Body: {pm_resp.text[:300]}")
            except Exception as e:
                self.stdout.write(f"   ERROR: {e}")

        # 3. Extract collector from access token format
        self.stdout.write("\n--- 3. Collector from token format ---")
        token_parts = access_token.split("-")
        if len(token_parts) >= 5:
            token_collector = token_parts[-1]
            self.stdout.write(f"   Extracted from token suffix: {token_collector}")
        else:
            token_collector = "?"
            self.stdout.write("   Could not extract (unexpected format)")

        # 4. Test payment creation (fake token → should get 400, NOT 500)
        self.stdout.write("\n--- 4. Test payment with fake token ---")
        sdk = mercadopago.SDK(access_token)
        result = sdk.payment().create({
            "transaction_amount": 100,
            "token": "fake_card_token_test",
            "description": "Diagnostic test",
            "installments": 1,
            "payment_method_id": "visa",
            "payer": {"email": "test_diag@test.com"},
        })
        mp_status = result.get("status")
        mp_response = result.get("response", {})
        self.stdout.write(f"   MP HTTP status: {mp_status}")
        self.stdout.write(f"   MP message: {mp_response.get('message', '?')}")
        if mp_status == 400:
            self.stdout.write("   GOOD: 400 means access_token is valid for payments")
        elif mp_status == 500:
            self.stdout.write("   BAD: 500 internal_error means credential problem!")

        # 5. Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("SUMMARY")
        self.stdout.write("=" * 60)
        if backend_collector and frontend_collector:
            match = str(backend_collector) == str(frontend_collector)
            self.stdout.write(f"Backend collector:  {backend_collector}")
            self.stdout.write(f"Frontend collector: {frontend_collector}")
            self.stdout.write(f"MATCH: {match}")
            if not match:
                self.stdout.write("\n*** CREDENTIALS MISMATCH! ***")
                self.stdout.write("The public key and access token belong to DIFFERENT MP apps.")
                self.stdout.write("Fix: go to https://www.mercadopago.cl/developers/panel/app")
                self.stdout.write("Find the app with your public key, copy its access token.")
        else:
            self.stdout.write(f"Backend collector: {backend_collector or 'UNKNOWN'}")
            self.stdout.write(f"Frontend collector: {frontend_collector or 'COULD NOT RESOLVE'}")
            self.stdout.write(f"Token-extracted collector: {token_collector}")
            self.stdout.write("\nCould not fully verify match via API.")
            self.stdout.write("MANUAL CHECK: go to https://www.mercadopago.cl/developers/panel/app")
            self.stdout.write("Verify BOTH credentials come from the SAME application.")
