"""
Testing settings for PEDIACORE.
Inherits production settings but disables SSL redirect so
Django's test client (HTTP) doesn't get 301 on every request.
"""

from .production import *  # noqa: F401, F403

# Disable HTTPS enforcement — test client uses HTTP
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0

# Faster password hashing for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Use local memory cache instead of Redis (tests don't have Redis)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "pediacore-test-cache",
    }
}

# Disable axes in tests — we test it explicitly via test_axes
AXES_ENABLED = False

# In-memory storage so tests don't write to disk
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.InMemoryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
