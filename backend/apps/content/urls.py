"""
URL patterns for the content app.

Public endpoints under content/ — AllowAny.
Admin endpoints under admin/ — IsDoctor.
"""

from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.content.views import (
    AdminBlogPostViewSet,
    AdminFAQViewSet,
    AdminPageViewSet,
    PublicBlogPostViewSet,
    PublicFAQListView,
    PublicPageDetailView,
)

app_name = "content"

# Public router — read-only blog listing and FAQ listing
public_router = DefaultRouter()
public_router.register(r"content/blog", PublicBlogPostViewSet, basename="public-blog")
public_router.register(r"content/faqs", PublicFAQListView, basename="public-faqs")

# Admin router — full CRUD
admin_router = DefaultRouter()
admin_router.register(r"admin/blog", AdminBlogPostViewSet, basename="admin-blog")
admin_router.register(r"admin/pages", AdminPageViewSet, basename="admin-pages")
admin_router.register(r"admin/faqs", AdminFAQViewSet, basename="admin-faqs")

urlpatterns = [
    # Public read-only
    path("", include(public_router.urls)),
    path("content/pages/<slug:slug>/", PublicPageDetailView.as_view({"get": "retrieve"}), name="public-page-detail"),
    # Admin full CRUD
    path("", include(admin_router.urls)),
]
