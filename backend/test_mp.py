import os
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings.production",
)
import django
django.setup()

import mercadopago
import requests
from django.conf import settings

token = settings.MERCADOPAGO_ACCESS_TOKEN
sdk = mercadopago.SDK(token)
print("Token:", token[:15])

# 1. Payment methods
r = sdk.payment_methods().list_all()
print("1. methods status:", r.get("status"))
for m in r.get("response", []):
    if m.get("id") == "debvisa":
        print("   debvisa:", m.get("name"))

# 2. Issuers
url = (
    "https://api.mercadopago.com"
    "/v1/payment_methods/card_issuers"
)
resp = requests.get(
    url,
    params={"payment_method_id": "debvisa"},
    headers={"Authorization": "Bearer " + token},
    timeout=10,
)
print("2. issuers status:", resp.status_code)
if resp.ok:
    for i in resp.json():
        print("   id=%s %s" % (i["id"], i["name"]))

# 3. Fake token payment
r2 = sdk.payment().create({
    "transaction_amount": 100,
    "token": "fake_token",
    "description": "Test",
    "installments": 1,
    "payment_method_id": "debvisa",
    "payer": {"email": "test@test.com"},
})
print("3. payment status:", r2.get("status"))
print("   response:", r2.get("response"))
