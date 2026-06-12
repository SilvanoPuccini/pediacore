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
    AdminVideoViewSet,
    PostEngagementView,
    PublicBlogPostViewSet,
    PublicFAQListView,
    PublicPageDetailView,
    PublicVideoViewSet,
    SubscribeView,
    SubscriptionStatusView,
    UnsubscribeView,
)

app_name = "content"

# Public router — read-only blog listing, FAQ listing, and video listing
public_router = DefaultRouter()
public_router.register(r"content/blog", PublicBlogPostViewSet, basename="public-blog")
public_router.register(r"content/faqs", PublicFAQListView, basename="public-faqs")
public_router.register(r"content/videos", PublicVideoViewSet, basename="public-video")

# Admin router — full CRUD
admin_router = DefaultRouter()
admin_router.register(r"admin/blog", AdminBlogPostViewSet, basename="admin-blog")
admin_router.register(r"admin/pages", AdminPageViewSet, basename="admin-pages")
admin_router.register(r"admin/faqs", AdminFAQViewSet, basename="admin-faqs")
admin_router.register(r"admin/videos", AdminVideoViewSet, basename="admin-video")

urlpatterns = [
    # Public read-only
    path("", include(public_router.urls)),
    path("content/pages/<slug:slug>/", PublicPageDetailView.as_view({"get": "retrieve"}), name="public-page-detail"),
    # Newsletter
    path("content/subscribe/", SubscribeView.as_view(), name="subscribe"),
    path("content/subscribe/status/", SubscriptionStatusView.as_view(), name="subscribe-status"),
    path("content/unsubscribe/", UnsubscribeView.as_view(), name="unsubscribe"),
    # Engagement
    path("content/blog/<slug:slug>/engage/", PostEngagementView.as_view(), name="post-engage"),
    # Admin full CRUD
    path("", include(admin_router.urls)),
]
