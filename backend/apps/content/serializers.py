"""
Serializers for the content app.

Public serializers are read-only and only surface published data.
Admin serializers support full CRUD and include draft visibility.
"""

from __future__ import annotations

from django.utils.text import slugify
from rest_framework import serializers

from apps.content.models import FAQ, BlogPost, Page


# ---------------------------------------------------------------------------
# Blog Post serializers
# ---------------------------------------------------------------------------


class BlogPostPublicSerializer(serializers.ModelSerializer):
    """Read-only serializer for the public blog listing and detail views."""

    author_name = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "cover_image",
            "published_at",
            "tags",
            "post_number",
            "meta_description",
            "author_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_author_name(self, obj: BlogPost) -> str:
        return obj.author.full_name or obj.author.email


class BlogPostAdminSerializer(serializers.ModelSerializer):
    """Full-CRUD serializer for admin (IsDoctor) endpoints."""

    author_name = serializers.SerializerMethodField(read_only=True)
    slug = serializers.SlugField(max_length=255, required=False, allow_blank=True)

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "practice",
            "author",
            "author_name",
            "title",
            "slug",
            "excerpt",
            "content",
            "cover_image",
            "is_published",
            "published_at",
            "tags",
            "post_number",
            "meta_description",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = ["id", "author", "author_name", "published_at", "post_number", "created_at", "updated_at", "deleted_at"]

    def get_author_name(self, obj: BlogPost) -> str:
        return obj.author.full_name or obj.author.email

    def validate_slug(self, value: str) -> str:
        """Ensure slug is properly formatted."""
        return slugify(value) if value else value

    def validate(self, attrs: dict) -> dict:
        """Auto-generate slug from title if not provided."""
        if not attrs.get("slug") and attrs.get("title"):
            attrs["slug"] = slugify(attrs["title"])
        return attrs


# ---------------------------------------------------------------------------
# Page serializers
# ---------------------------------------------------------------------------


class PagePublicSerializer(serializers.ModelSerializer):
    """Read-only serializer for public page detail view."""

    class Meta:
        model = Page
        fields = [
            "id",
            "title",
            "slug",
            "content",
            "order",
            "meta_description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PageAdminSerializer(serializers.ModelSerializer):
    """Full-CRUD serializer for admin page management."""

    class Meta:
        model = Page
        fields = [
            "id",
            "practice",
            "title",
            "slug",
            "content",
            "is_published",
            "order",
            "meta_description",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at"]


# ---------------------------------------------------------------------------
# FAQ serializers
# ---------------------------------------------------------------------------


class FAQPublicSerializer(serializers.ModelSerializer):
    """Read-only serializer for the public FAQ listing."""

    class Meta:
        model = FAQ
        fields = [
            "id",
            "question",
            "answer",
            "order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class FAQAdminSerializer(serializers.ModelSerializer):
    """Full-CRUD serializer for admin FAQ management."""

    class Meta:
        model = FAQ
        fields = [
            "id",
            "practice",
            "question",
            "answer",
            "order",
            "is_published",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at"]


# ---------------------------------------------------------------------------
# Newsletter serializers
# ---------------------------------------------------------------------------


class SubscribeSerializer(serializers.Serializer):
    """Serializer for newsletter subscription requests.

    Includes a honeypot field (website) to silently reject bots.
    """

    email = serializers.EmailField()
    name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    website = serializers.CharField(required=False, allow_blank=True, default="")  # honeypot


# ---------------------------------------------------------------------------
# Engagement serializers
# ---------------------------------------------------------------------------


class EngagementSerializer(serializers.Serializer):
    engagement_type = serializers.ChoiceField(choices=["USEFUL", "LOVE", "RATING"])
    value = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    session_key = serializers.CharField(max_length=64)

    def validate(self, attrs):
        if attrs["engagement_type"] == "RATING" and not attrs.get("value"):
            raise serializers.ValidationError({"value": "Rating requires a value between 1 and 5."})
        if attrs["engagement_type"] != "RATING":
            attrs["value"] = None
        return attrs


class EngagementSummarySerializer(serializers.Serializer):
    useful_count = serializers.IntegerField()
    love_count = serializers.IntegerField()
    rating_count = serializers.IntegerField()
    rating_avg = serializers.FloatField(allow_null=True)
    user_engagements = serializers.ListField(child=serializers.CharField())
    user_rating = serializers.IntegerField(allow_null=True)
