"""
Views for the content app.

Public views are read-only and filter to published content only.
Admin views require IsDoctor permission and expose full CRUD plus
publish/unpublish actions for blog posts.
"""

from __future__ import annotations

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.content.models import FAQ, BlogPost, Page
from apps.content.serializers import (
    BlogPostAdminSerializer,
    BlogPostPublicSerializer,
    FAQAdminSerializer,
    FAQPublicSerializer,
    PageAdminSerializer,
    PagePublicSerializer,
)
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor


# ---------------------------------------------------------------------------
# Public views
# ---------------------------------------------------------------------------


class PublicBlogPostViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only endpoints for published blog posts.

    GET /api/v1/content/blog/           — paginated list with ?search= and ?tag= filters
    GET /api/v1/content/blog/<slug>/    — post detail by slug
    """

    serializer_class = BlogPostPublicSerializer
    pagination_class = StandardPagination
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "content", "excerpt"]

    def get_queryset(self) -> QuerySet[BlogPost]:
        qs = BlogPost.objects.filter(is_published=True).select_related("author", "practice")

        tag = self.request.query_params.get("tag")
        if tag:
            qs = qs.filter(tags__icontains=tag)

        return qs


class PublicPageDetailView(viewsets.ViewSet):
    """
    Public read-only endpoint for a single published static page.

    GET /api/v1/content/pages/<slug>/
    """

    permission_classes = [AllowAny]

    def retrieve(self, request: Request, slug: str | None = None) -> Response:
        page = get_object_or_404(Page, slug=slug, is_published=True)
        serializer = PagePublicSerializer(page)
        return Response(serializer.data)


class PublicFAQListView(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only endpoint for published FAQs.

    GET /api/v1/content/faqs/
    """

    serializer_class = FAQPublicSerializer
    pagination_class = StandardPagination
    permission_classes = [AllowAny]

    def get_queryset(self) -> QuerySet[FAQ]:
        return FAQ.objects.filter(is_published=True).select_related("practice")


# ---------------------------------------------------------------------------
# Admin views
# ---------------------------------------------------------------------------


class AdminBlogPostViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD endpoints for blog posts (IsDoctor only).

    GET    /api/v1/admin/blog/              — all posts including drafts
    POST   /api/v1/admin/blog/              — create post (author auto-set)
    GET    /api/v1/admin/blog/<pk>/         — detail
    PUT    /api/v1/admin/blog/<pk>/         — update
    DELETE /api/v1/admin/blog/<pk>/         — soft delete
    POST   /api/v1/admin/blog/<pk>/publish/
    POST   /api/v1/admin/blog/<pk>/unpublish/
    """

    serializer_class = BlogPostAdminSerializer
    pagination_class = StandardPagination
    permission_classes = [IsDoctor]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "content", "tags"]
    ordering_fields = ["published_at", "created_at", "title"]

    def get_queryset(self) -> QuerySet[BlogPost]:
        return BlogPost.objects.select_related("author", "practice").order_by("-created_at")

    def perform_create(self, serializer: BlogPostAdminSerializer) -> None:
        """Auto-assign the request user as author. Auto-generate slug if missing."""
        title = serializer.validated_data.get("title", "")
        slug = serializer.validated_data.get("slug") or slugify(title)
        serializer.save(author=self.request.user, slug=slug)

    @action(detail=True, methods=["post"])
    def publish(self, request: Request, pk: int | None = None) -> Response:
        post = self.get_object()
        post.publish()
        serializer = self.get_serializer(post)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unpublish(self, request: Request, pk: int | None = None) -> Response:
        post = self.get_object()
        post.unpublish()
        serializer = self.get_serializer(post)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminPageViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD endpoints for static pages (IsDoctor only).

    GET    /api/v1/admin/pages/
    POST   /api/v1/admin/pages/
    PUT    /api/v1/admin/pages/<pk>/
    DELETE /api/v1/admin/pages/<pk>/
    """

    serializer_class = PageAdminSerializer
    pagination_class = StandardPagination
    permission_classes = [IsDoctor]

    def get_queryset(self) -> QuerySet[Page]:
        return Page.objects.select_related("practice").order_by("order", "title")


class AdminFAQViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD endpoints for FAQs (IsDoctor only).

    GET    /api/v1/admin/faqs/
    POST   /api/v1/admin/faqs/
    PUT    /api/v1/admin/faqs/<pk>/
    DELETE /api/v1/admin/faqs/<pk>/
    """

    serializer_class = FAQAdminSerializer
    pagination_class = StandardPagination
    permission_classes = [IsDoctor]

    def get_queryset(self) -> QuerySet[FAQ]:
        return FAQ.objects.select_related("practice").order_by("order")
