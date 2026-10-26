"""Credentials for accounts created by the seed_data command.

Seed passwords are never stored in the repository: they come from the
SEED_USER_PASSWORD environment variable, and without it seeded accounts get an
unusable password (password reset is the only way in).
"""

from __future__ import annotations

import os

from django.contrib.auth.base_user import AbstractBaseUser

SEED_PASSWORD_ENV = "SEED_USER_PASSWORD"

# Password committed to this public repository; any seeded account still
# using it is considered compromised.
LEAKED_SEED_PASSWORDS: tuple[str, ...] = ("PediaCore2024!",)

SEEDED_ACCOUNT_EMAILS: tuple[str, ...] = (
    "doctor@estefipediatra.com",
    "tutor@demo.com",
    "javier@demo.com",
)


def apply_seed_password(user: AbstractBaseUser) -> None:
    """Set the env-provided seed password, or make the login unusable."""
    password = os.environ.get(SEED_PASSWORD_ENV)
    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()
