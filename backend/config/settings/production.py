"""
Production settings for PEDIACORE.
Security hardening and performance optimizations.
"""

import sentry_sdk
from django.core.exceptions import ImproperlyConfigured

from decouple import config

from .base import *  # noqa: F401, F403

# Sentry — error monitoring (leave SENTRY_DSN empty to disable)
_sentry_dsn = config("SENTRY_DSN", default="")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        traces_sample_rate=0,
        send_default_pii=False,
    )

DEBUG = False

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="estefipediatra.com,www.estefipediatra.com",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# Security — HTTPS enforcement
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# CSP is handled by nginx (not django-csp) to cover both API and frontend responses.

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = [
    "https://estefipediatra.com",
    "https://www.estefipediatra.com",
]

# Session security — 8 hours for admin (medical records)
SESSION_COOKIE_AGE = 28800  # 8 hours

# CORS — only production frontend
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="https://estefipediatra.com,https://www.estefipediatra.com",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# Email backend — Resend in production (via SMTP or API)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.resend.com"
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_HOST_USER = "resend"
EMAIL_HOST_PASSWORD = config("RESEND_API_KEY", default="")

# Cache — Redis for speed and axes rate limiting
_redis_password = config("REDIS_PASSWORD", default="")
_redis_location = (
    f"redis://:{_redis_password}@redis:6379/0"
    if _redis_password
    else config("REDIS_URL", default="redis://redis:6379/0")
)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": _redis_location,
    }
}

# Logging — more verbose in production for monitoring
LOGGING["handlers"]["file"] = {  # noqa: F405
    "class": "logging.FileHandler",
    "filename": "/var/log/pediacore/app.log",
    "formatter": "verbose",
}
LOGGING["root"]["handlers"] = ["console", "file"]  # noqa: F405

# Throttle — SPA makes multiple API calls per page view
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "500/hour",
    "user": "3000/hour",
    "login": "5/minute",
}

# Disable DRF browsable API in production — JSON only
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
]

# MercadoPago webhook secret is mandatory in production to prevent HMAC bypass
if not MERCADOPAGO_WEBHOOK_SECRET:  # noqa: F405
    raise ImproperlyConfigured(
        "MERCADOPAGO_WEBHOOK_SECRET must be set in production. "
        "Set it in your .env file."
    )
