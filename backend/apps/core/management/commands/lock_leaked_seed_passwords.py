"""
Lock seeded accounts that still use a password published in the repository.

Idempotent and safe to run on every start: only seeded accounts whose password
matches a leaked one are touched; their outstanding refresh tokens are revoked.
Affected users recover access via password reset.

Usage:
    python manage.py lock_leaked_seed_passwords
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.core.seed_credentials import LEAKED_SEED_PASSWORDS, SEEDED_ACCOUNT_EMAILS


class Command(BaseCommand):
    help = "Disable seeded logins that still use a publicly leaked password."

    def handle(self, *args, **options) -> None:
        locked = 0
        for user in get_user_model().objects.filter(email__in=SEEDED_ACCOUNT_EMAILS):
            if not any(user.check_password(p) for p in LEAKED_SEED_PASSWORDS):
                continue
            user.set_unusable_password()
            user.save(update_fields=["password"])
            for token in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=token)
            locked += 1
            self.stdout.write(f"  Locked leaked seed login: {user.email}")

        self.stdout.write(self.style.SUCCESS(f"Leaked seed logins locked: {locked}"))
