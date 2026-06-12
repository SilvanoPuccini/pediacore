"""
Views for the content app.

Public views are read-only and filter to published content only.
Admin views require IsDoctor permission and expose full CRUD plus
publish/unpublish actions for blog posts.
"""

from __future__ import annotations

import hashlib
import hmac

from django.conf import settings
from django.db import models
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.utils.text import slugify
from django_ratelimit.decorators import ratelimit
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import FAQ, BlogPost, Page, PostEngagement, Subscriber, VideoResource
from apps.content.serializers import (
    BlogPostAdminSerializer,
    BlogPostPublicSerializer,
    EngagementSerializer,
    FAQAdminSerializer,
    FAQPublicSerializer,
    PageAdminSerializer,
    PagePublicSerializer,
    SubscribeSerializer,
    VideoResourceAdminSerializer,
    VideoResourcePublicSerializer,
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
    GET /api/v1/content/blog/popular/   — top 6 posts by engagement count
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

        return qs.order_by("post_number")

    @action(detail=False, methods=["get"])
    def popular(self, request: Request) -> Response:
        """Return top 6 published posts ranked by total engagement count."""
        qs = (
            BlogPost.objects.filter(is_published=True)
            .select_related("author", "practice")
            .annotate(engagement_count=models.Count("engagements"))
            .order_by("-engagement_count", "-published_at")[:6]
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


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


# ---------------------------------------------------------------------------
# Video views
# ---------------------------------------------------------------------------


class PublicVideoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only endpoints for published videos.

    GET /api/v1/content/videos/           — paginated list with ?search= and ?category= filters
    GET /api/v1/content/videos/<slug>/    — video detail by slug
    POST /api/v1/content/videos/<slug>/increment_view/ — bump view counter
    """

    serializer_class = VideoResourcePublicSerializer
    pagination_class = StandardPagination
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description"]

    def get_queryset(self) -> QuerySet[VideoResource]:
        qs = VideoResource.objects.filter(is_published=True).select_related("author", "practice")
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category.upper())
        return qs

    @action(detail=True, methods=["post"])
    def increment_view(self, request: Request, slug: str | None = None) -> Response:
        video = self.get_object()
        VideoResource.objects.filter(pk=video.pk).update(view_count=models.F("view_count") + 1)
        return Response({"view_count": video.view_count + 1})


class AdminVideoViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD endpoints for videos (IsDoctor only).

    GET    /api/v1/admin/videos/              — all videos including drafts
    POST   /api/v1/admin/videos/              — create video (author auto-set)
    GET    /api/v1/admin/videos/<pk>/         — detail
    PUT    /api/v1/admin/videos/<pk>/         — update
    DELETE /api/v1/admin/videos/<pk>/         — soft delete
    POST   /api/v1/admin/videos/<pk>/publish/
    POST   /api/v1/admin/videos/<pk>/unpublish/
    """

    serializer_class = VideoResourceAdminSerializer
    pagination_class = StandardPagination
    permission_classes = [IsDoctor]

    def get_queryset(self) -> QuerySet[VideoResource]:
        return VideoResource.objects.select_related("author", "practice").order_by("-created_at")

    def perform_create(self, serializer: VideoResourceAdminSerializer) -> None:
        """Auto-assign the request user as author and their practice."""
        serializer.save(author=self.request.user, practice=self.request.user.practice)

    @action(detail=True, methods=["post"])
    def publish(self, request: Request, pk: int | None = None) -> Response:
        video = self.get_object()
        video.publish()
        serializer = self.get_serializer(video)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unpublish(self, request: Request, pk: int | None = None) -> Response:
        video = self.get_object()
        video.unpublish()
        serializer = self.get_serializer(video)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Newsletter views
# ---------------------------------------------------------------------------


class SubscribeView(APIView):
    """
    Public endpoint for newsletter subscription.

    POST /api/v1/content/subscribe/
    """

    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key="ip", rate="5/h", method="POST", block=True))
    def post(self, request: Request) -> Response:
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Honeypot — bots fill the hidden "website" field
        if serializer.validated_data.get("website"):
            return Response({"detail": "OK"}, status=status.HTTP_200_OK)

        email = serializer.validated_data["email"].lower()
        name = serializer.validated_data.get("name", "")

        subscriber, created = Subscriber.objects.get_or_create(
            email=email,
            defaults={"name": name, "status": "ACTIVE"},
        )

        if not created and subscriber.status == "UNSUBSCRIBED":
            subscriber.status = "ACTIVE"
            subscriber.name = name or subscriber.name
            subscriber.save(update_fields=["status", "name", "updated_at"])
            created = True  # treat reactivation as new for welcome email

        if created:
            from apps.content.services import send_welcome_email

            send_welcome_email(subscriber)
            return Response(
                {"detail": "Suscripción confirmada", "already_subscribed": False},
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {"detail": "Ya estás suscripto/a", "already_subscribed": True},
            status=status.HTTP_200_OK,
        )


class SubscriptionStatusView(APIView):
    """Check if the authenticated user's email is already subscribed."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        email = request.user.email.lower()
        subscribed = Subscriber.objects.filter(
            email=email, status="ACTIVE"
        ).exists()
        return Response({"subscribed": subscribed, "email": email})


class UnsubscribeView(APIView):
    """
    Public endpoint for newsletter unsubscription via signed token.

    GET /api/v1/content/unsubscribe/?token=XXX&email=YYY
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        token = request.query_params.get("token", "")
        email = request.query_params.get("email", "")

        if not token or not email:
            return Response(
                {"detail": "Parámetros inválidos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected = hmac.new(
            settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(token, expected):
            return Response(
                {"detail": "Token inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subscriber = Subscriber.objects.get(email=email)
            subscriber.status = "UNSUBSCRIBED"
            subscriber.save(update_fields=["status", "updated_at"])
        except Subscriber.DoesNotExist:
            pass  # Silently ignore — don't leak subscriber existence

        return Response({"detail": "Te has dado de baja del newsletter"})


# ---------------------------------------------------------------------------
# Engagement views
# ---------------------------------------------------------------------------


class PostEngagementView(APIView):
    """
    Blog post engagement (reactions + ratings).

    GET  /api/v1/content/blog/{slug}/engage/ — aggregated counts + user's own engagements
    POST /api/v1/content/blog/{slug}/engage/ — submit reaction or rating
    """

    permission_classes = [AllowAny]

    def _get_client_ip(self, request: Request) -> str | None:
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")

    def get(self, request: Request, slug: str) -> Response:
        from django.db.models import Avg, Count, Q

        post = get_object_or_404(BlogPost, slug=slug, is_published=True)
        session_key = request.query_params.get("session_key", "")

        engagements = PostEngagement.objects.filter(blog_post=post)

        stats = engagements.aggregate(
            useful_count=Count("id", filter=Q(engagement_type="USEFUL")),
            love_count=Count("id", filter=Q(engagement_type="LOVE")),
            rating_count=Count("id", filter=Q(engagement_type="RATING")),
            rating_avg=Avg("value", filter=Q(engagement_type="RATING")),
        )

        # User's own engagements
        user_engagements = []
        user_rating = None
        if session_key:
            user_entries = engagements.filter(session_key=session_key)
            user_engagements = list(user_entries.values_list("engagement_type", flat=True))
            rating_entry = user_entries.filter(engagement_type="RATING").first()
            if rating_entry:
                user_rating = rating_entry.value

        data = {
            **stats,
            "rating_avg": round(stats["rating_avg"], 1) if stats["rating_avg"] else None,
            "user_engagements": user_engagements,
            "user_rating": user_rating,
        }
        return Response(data)

    def post(self, request: Request, slug: str) -> Response:
        post = get_object_or_404(BlogPost, slug=slug, is_published=True)
        serializer = EngagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        ip = self._get_client_ip(request)

        engagement, created = PostEngagement.objects.update_or_create(
            blog_post=post,
            engagement_type=data["engagement_type"],
            session_key=data["session_key"],
            defaults={"value": data.get("value"), "ip_address": ip},
        )

        return Response(
            {"detail": "Engagement registered", "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
