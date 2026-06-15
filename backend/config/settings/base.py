"""
Base settings for PEDIACORE project.
Common configuration shared across all environments.
"""

from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY
SECRET_KEY = config("SECRET_KEY")
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# Application definition
DJANGO_APPS = [
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "unfold.contrib.inlines",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.mfa",
    "axes",
    "django_q",
    "django_ckeditor_5",
]

LOCAL_APPS = [
    "apps.core",
    "apps.users",
    "apps.practice",
    "apps.patients",
    "apps.medical_records",
    "apps.scheduling",
    "apps.billing",
    "apps.content",
    "apps.notifications",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "apps.core.middleware.ContentSecurityPolicyMiddleware",
    "axes.middleware.AxesMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="pediacore"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default="postgres"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

# Password hashing — Argon2 as primary
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Custom user model
AUTH_USER_MODEL = "users.User"

# Authentication backends — axes must come first
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# ── django-axes: brute-force protection ──
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = timedelta(minutes=15)
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_PARAMETERS = ["ip_address", "username"]

# ── allauth MFA (TOTP) ──
MFA_ADAPTER = "allauth.mfa.adapter.DefaultMFAAdapter"
MFA_SUPPORTED_TYPES = ["totp"]
MFA_TOTP_ISSUER = "PEDIACORE"

# Internationalization
LANGUAGE_CODE = "es-cl"
TIME_ZONE = "America/Santiago"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Sites framework
SITE_ID = 1

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
    },
}

# SimpleJWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
}

# django-allauth
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_UNIQUE_EMAIL = True

# CORS
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173",
    cast=Csv(),
)

# drf-spectacular (OpenAPI)
SPECTACULAR_SETTINGS = {
    "TITLE": "PEDIACORE API",
    "DESCRIPTION": "API para plataforma de consultorios pediátricos",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Django-Q2 (async tasks)
Q_CLUSTER = {
    "name": "pediacore",
    "workers": 2,
    "recycle": 500,
    "timeout": 60,
    "compress": True,
    "save_limit": 250,
    "queue_limit": 500,
    "cpu_affinity": 1,
    "label": "Django Q2",
    "orm": "default",
}

# Resend (email)
RESEND_API_KEY = config("RESEND_API_KEY", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="Dra. Estefanía <no-reply@estefipediatra.com>")
DEFAULT_REPLY_TO_EMAIL = config("DEFAULT_REPLY_TO_EMAIL", default="estefiortigosa.pediatra@gmail.com")

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN = config("MERCADOPAGO_ACCESS_TOKEN", default="")
MERCADOPAGO_WEBHOOK_SECRET = config("MERCADOPAGO_WEBHOOK_SECRET", default="")

# Zoom (Server-to-Server OAuth)
ZOOM_ACCOUNT_ID = config("ZOOM_ACCOUNT_ID", default="")
ZOOM_CLIENT_ID = config("ZOOM_CLIENT_ID", default="")
ZOOM_CLIENT_SECRET = config("ZOOM_CLIENT_SECRET", default="")

# URLs for payment back_urls and notification_url
FRONTEND_URL = config("FRONTEND_URL", default="https://estefipediatra.com")
BACKEND_URL = config("BACKEND_URL", default="https://api.estefipediatra.com")

# Booking flow
BOOKING_HOLD_MINUTES = config("BOOKING_HOLD_MINUTES", default=10, cast=int)
BOOKING_HOLD_EXPIRY_INTERVAL_MINUTES = config("BOOKING_HOLD_EXPIRY_INTERVAL_MINUTES", default=2, cast=int)

# Appointment token TTL
APPOINTMENT_TOKEN_EXPIRY_HOURS = config("APPOINTMENT_TOKEN_EXPIRY_HOURS", default=72, cast=int)

# Site URL for building token links in emails
SITE_URL = config("SITE_URL", default="https://estefipediatra.com")

# Sentry
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
    )

# File upload limits
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Gemini AI (OCR for transfer receipts)
GEMINI_API_KEY = config("GEMINI_API_KEY", default="")

# ─── Django Unfold (Admin theme) ─────────────────────────────────────────────
UNFOLD = {
    "DASHBOARD_CALLBACK": "apps.core.dashboard.dashboard_callback",
    "SITE_TITLE": "PEDIACORE",
    "SITE_HEADER": "PEDIACORE",
    "SITE_SUBHEADER": "Panel de administración — Dra. Estefanía Ortigosa",
    "SITE_URL": "/",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "STYLES": [
        lambda request: "admin/custom.css",
    ],
    "COLORS": {
        "primary": {
            "50": "#D6F1EA",
            "100": "#B8E6DB",
            "200": "#93D9C8",
            "300": "#7DD3C0",
            "400": "#5CB8A4",
            "500": "#3E8E7C",
            "600": "#2E6B5E",
            "700": "#1F4D43",
            "800": "#143530",
            "900": "#0A1D1A",
            "950": "#050F0D",
        },
    },
    "SIDEBAR": {
        "show_search": False,
        "show_all_applications": False,
        "navigation": [
            {
                "title": "Consultorio",
                "separator": True,
                "items": [
                    {
                        "title": "Dashboard",
                        "icon": "dashboard",
                        "link": "/gestion-9f3a/",
                    },
                    {
                        "title": "Ir al Dashboard médico",
                        "icon": "open_in_new",
                        "link": "/dashboard",
                    },
                    {
                        "title": "Ver sitio público",
                        "icon": "language",
                        "link": "/",
                    },
                    {
                        "title": "Turnos",
                        "icon": "calendar_month",
                        "link": "/gestion-9f3a/scheduling/appointment/",
                    },
                    {
                        "title": "Lista de espera",
                        "icon": "hourglass_top",
                        "link": "/gestion-9f3a/scheduling/waitlistentry/",
                    },
                ],
            },
            {
                "title": "Pacientes",
                "separator": True,
                "items": [
                    {
                        "title": "Pacientes",
                        "icon": "child_care",
                        "link": "/gestion-9f3a/patients/patient/",
                    },
                    {
                        "title": "Encuentros clínicos",
                        "icon": "stethoscope",
                        "link": "/gestion-9f3a/medical_records/encounter/",
                    },
                    {
                        "title": "Diagnósticos",
                        "icon": "diagnosis",
                        "link": "/gestion-9f3a/medical_records/diagnosis/",
                    },
                ],
            },
            {
                "title": "Facturación",
                "separator": True,
                "items": [
                    {
                        "title": "Pagos",
                        "icon": "payments",
                        "link": "/gestion-9f3a/billing/payment/",
                    },
                    {
                        "title": "Comprobantes",
                        "icon": "receipt_long",
                        "link": "/gestion-9f3a/billing/invoice/",
                    },
                    {
                        "title": "Proveedores de pago",
                        "icon": "account_balance",
                        "link": "/gestion-9f3a/billing/paymentprovider/",
                    },
                ],
            },
            {
                "title": "Contenido",
                "separator": True,
                "items": [
                    {
                        "title": "Blog",
                        "icon": "article",
                        "link": "/gestion-9f3a/content/blogpost/",
                    },
                    {
                        "title": "Páginas",
                        "icon": "web",
                        "link": "/gestion-9f3a/content/page/",
                    },
                    {
                        "title": "FAQs",
                        "icon": "quiz",
                        "link": "/gestion-9f3a/content/faq/",
                    },
                ],
            },
            {
                "title": "Configuración",
                "separator": True,
                "items": [
                    {
                        "title": "Usuarios",
                        "icon": "group",
                        "link": "/gestion-9f3a/users/user/",
                    },
                    {
                        "title": "Consultorios",
                        "icon": "local_hospital",
                        "link": "/gestion-9f3a/practice/practice/",
                    },
                    {
                        "title": "Sedes",
                        "icon": "location_on",
                        "link": "/gestion-9f3a/practice/location/",
                    },
                    {
                        "title": "Servicios",
                        "icon": "medical_services",
                        "link": "/gestion-9f3a/practice/service/",
                    },
                    {
                        "title": "Horarios",
                        "icon": "schedule",
                        "link": "/gestion-9f3a/practice/workinghours/",
                    },
                    {
                        "title": "Bloqueos",
                        "icon": "block",
                        "link": "/gestion-9f3a/practice/blockedslot/",
                    },
                    {
                        "title": "Auto-respondedor",
                        "icon": "smart_toy",
                        "link": "/gestion-9f3a/scheduling/autoresponderconfig/",
                    },
                    {
                        "title": "Pol. cancelación",
                        "icon": "gavel",
                        "link": "/gestion-9f3a/scheduling/cancellationpolicy/",
                    },
                ],
            },
            {
                "title": "Sistema",
                "separator": True,
                "items": [
                    {
                        "title": "Notificaciones",
                        "icon": "notifications",
                        "link": "/gestion-9f3a/notifications/notification/",
                    },
                    {
                        "title": "Emails enviados",
                        "icon": "mail",
                        "link": "/gestion-9f3a/notifications/emaillog/",
                    },
                    {
                        "title": "Plantillas email",
                        "icon": "description",
                        "link": "/gestion-9f3a/notifications/notificationtemplate/",
                    },
                    {
                        "title": "Auditoría",
                        "icon": "shield",
                        "link": "/gestion-9f3a/core/auditlog/",
                    },
                    {
                        "title": "Tokens de turno",
                        "icon": "key",
                        "link": "/gestion-9f3a/scheduling/appointmenttoken/",
                    },
                ],
            },
        ],
    },
}

# ─── CKEditor 5 ──────────────────────────────────────────────────────────────
CK_EDITOR_5_UPLOAD_FILE_TYPES = ["jpeg", "jpg", "png", "gif", "webp"]
CK_EDITOR_5_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

CKEDITOR_5_CONFIGS = {
    "default": {
        "toolbar": [
            "heading", "|",
            "bold", "italic", "underline", "strikethrough", "|",
            "link", "bulletedList", "numberedList", "blockQuote", "|",
            "imageUpload", "mediaEmbed", "|",
            "insertTable", "horizontalLine", "|",
            "sourceEditing",
        ],
        "heading": {
            "options": [
                {"model": "paragraph", "title": "Párrafo", "class": "ck-heading_paragraph"},
                {"model": "heading2", "view": "h2", "title": "Título sección", "class": "ck-heading_heading2"},
                {"model": "heading3", "view": "h3", "title": "Subtítulo", "class": "ck-heading_heading3"},
            ],
        },
        "image": {
            "toolbar": ["imageTextAlternative", "imageStyle:inline", "imageStyle:block", "imageStyle:side"],
        },
        "table": {
            "contentToolbar": ["tableColumn", "tableRow", "mergeTableCells"],
        },
        "mediaEmbed": {
            "previewsInData": True,
        },
        "htmlSupport": {
            "allow": [
                {"name": "div", "classes": True},
                {"name": "span", "classes": True, "styles": True},
            ],
        },
    },
}

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
