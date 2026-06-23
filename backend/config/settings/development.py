"""
Development settings for PEDIACORE.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# Restrict to local hosts in development
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# CORS — allow all in development
CORS_ALLOW_ALL_ORIGINS = True

# Debug toolbar
INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
INTERNAL_IPS = ["127.0.0.1"]

# Email backend — console in development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Use in-memory storage in development/tests
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.InMemoryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Disable throttling in development
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {}  # noqa: F405
