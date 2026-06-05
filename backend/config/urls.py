"""
URL configuration for PEDIACORE project.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

# Point the "View site" link in Django admin to the React dashboard
admin.site.site_url = "/dashboard/"

urlpatterns = [
    path("admin/", admin.site.urls),
    # JWT auth
    path("api/v1/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    # API v1 — apps will register their URLs here
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.practice.urls")),
    path("api/v1/", include("apps.patients.urls")),
    path("api/v1/", include("apps.medical_records.urls")),
    path("api/v1/", include("apps.scheduling.urls")),
    path("api/v1/", include("apps.billing.urls")),
    path("api/v1/", include("apps.content.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    # Health check
    path("health/", lambda request: __import__("django.http", fromlist=["JsonResponse"]).JsonResponse({"status": "ok"})),
]

# OpenAPI docs only in non-production or for staff
if not settings.DEBUG:
    # In production, require staff access for API docs
    from django.contrib.admin.views.decorators import staff_member_required

    SpectacularAPIViewProtected = staff_member_required(
        SpectacularAPIView.as_view()
    )
    SpectacularSwaggerViewProtected = staff_member_required(
        SpectacularSwaggerView.as_view(url_name="schema")
    )
    SpectacularRedocViewProtected = staff_member_required(
        SpectacularRedocView.as_view(url_name="schema")
    )
    urlpatterns += [
        path("api/schema/", SpectacularAPIViewProtected, name="schema"),
        path("api/docs/", SpectacularSwaggerViewProtected, name="swagger-ui"),
        path("api/redoc/", SpectacularRedocViewProtected, name="redoc"),
    ]
else:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    ]

if settings.DEBUG:
    import debug_toolbar

    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]
