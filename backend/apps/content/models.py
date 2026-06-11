"""
Models for the content app.

Manages public-facing content: blog posts, static pages, and FAQs.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import BaseModel


class BlogPost(BaseModel):
    """
    Blog post for the practice's public website.

    Posts are either drafts (is_published=False) or published.
    Publish/unpublish state is controlled via the publish() and unpublish() methods.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="blog_posts",
        verbose_name=_("practice"),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="blog_posts",
        verbose_name=_("author"),
    )
    title = models.CharField(_("title"), max_length=255)
    slug = models.SlugField(_("slug"), max_length=255, unique=True)
    excerpt = models.TextField(_("excerpt"), blank=True, help_text=_("Short summary for listing pages."))
    content = models.TextField(_("content"), help_text=_("Full HTML/Markdown content."))
    cover_image = models.ImageField(
        _("cover image"),
        upload_to="blog/covers/",
        blank=True,
    )
    is_published = models.BooleanField(_("published"), default=False)
    published_at = models.DateTimeField(_("published at"), null=True, blank=True)
    tags = models.CharField(
        _("tags"),
        max_length=500,
        blank=True,
        help_text=_("Comma-separated tags, e.g. salud,pediatría,vacunas"),
    )
    post_number = models.PositiveIntegerField(
        _("post number"),
        null=True,
        blank=True,
        unique=True,
        help_text=_("Auto-assigned sequential number on first publish."),
    )
    meta_description = models.CharField(_("meta description"), max_length=255, blank=True)

    class Meta:
        db_table = "blog_posts"
        ordering = ["-published_at", "-created_at"]
        verbose_name = _("blog post")
        verbose_name_plural = _("blog posts")

    def __str__(self) -> str:
        return self.title

    # ------------------------------------------------------------------
    # Domain actions
    # ------------------------------------------------------------------

    def publish(self) -> None:
        """Mark this post as published. Sets published_at and post_number on first publish."""
        self.is_published = True
        if self.published_at is None:
            self.published_at = timezone.now()
        if self.post_number is None:
            last = BlogPost.objects.filter(post_number__isnull=False).order_by("-post_number").values_list("post_number", flat=True).first()
            self.post_number = (last or 0) + 1
        self.save(update_fields=["is_published", "published_at", "post_number", "updated_at"])

    def unpublish(self) -> None:
        """Retract this post from public visibility."""
        self.is_published = False
        self.save(update_fields=["is_published", "updated_at"])


class Page(BaseModel):
    """
    Static page for the practice's public website (e.g. About, Contact).

    Slugs are unique per practice, allowing each practice to have its own
    set of static pages without collision.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="pages",
        verbose_name=_("practice"),
    )
    title = models.CharField(_("title"), max_length=255)
    slug = models.SlugField(_("slug"), max_length=255)
    content = models.TextField(_("content"), help_text=_("HTML content for this page."))
    is_published = models.BooleanField(_("published"), default=False)
    order = models.PositiveIntegerField(_("order"), default=0, help_text=_("Controls display order in menus."))
    meta_description = models.CharField(_("meta description"), max_length=255, blank=True)

    class Meta:
        db_table = "pages"
        ordering = ["order", "title"]
        unique_together = [("practice", "slug")]
        verbose_name = _("page")
        verbose_name_plural = _("pages")

    def __str__(self) -> str:
        return f"{self.title} ({self.practice.name})"


class FAQ(BaseModel):
    """
    Frequently Asked Question for the practice's public website.

    FAQs are ordered by the `order` field and can be toggled visible/hidden
    independently via is_published.
    """

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="faqs",
        verbose_name=_("practice"),
    )
    question = models.CharField(_("question"), max_length=500)
    answer = models.TextField(_("answer"))
    order = models.PositiveIntegerField(_("order"), default=0, help_text=_("Controls display order."))
    is_published = models.BooleanField(_("published"), default=False)

    class Meta:
        db_table = "faqs"
        ordering = ["order"]
        verbose_name = _("FAQ")
        verbose_name_plural = _("FAQs")

    def __str__(self) -> str:
        return self.question


class Subscriber(BaseModel):
    """
    Newsletter subscriber for the practice's blog notifications.

    Subscribers opt-in via the public subscribe endpoint and can
    unsubscribe at any time via a signed token link.
    """

    email = models.EmailField(unique=True, max_length=255)
    name = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("ACTIVE", "Active"), ("UNSUBSCRIBED", "Unsubscribed")],
        default="ACTIVE",
        db_index=True,
    )

    class Meta:
        db_table = "subscribers"
        ordering = ["-created_at"]
        verbose_name = "subscriber"
        verbose_name_plural = "subscribers"

    def __str__(self) -> str:
        return self.email


class NewsletterSent(BaseModel):
    """
    Record of a newsletter send triggered by a blog post publish event.

    Tracks how many subscribers received each notification.
    """

    blog_post = models.ForeignKey(
        "content.BlogPost",
        on_delete=models.CASCADE,
        related_name="newsletter_sends",
    )
    recipients_count = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "newsletter_sent"
        ordering = ["-sent_at"]
        verbose_name = "newsletter sent"
        verbose_name_plural = "newsletters sent"

    def __str__(self) -> str:
        return f"Newsletter for '{self.blog_post.title}' ({self.recipients_count} recipients)"


class PostEngagement(BaseModel):
    """Tracks reader engagement: reactions and star ratings on blog posts."""

    ENGAGEMENT_TYPES = [
        ("USEFUL", "Useful"),
        ("LOVE", "Love"),
        ("RATING", "Rating"),
    ]

    blog_post = models.ForeignKey(
        "content.BlogPost",
        on_delete=models.CASCADE,
        related_name="engagements",
    )
    engagement_type = models.CharField(max_length=10, choices=ENGAGEMENT_TYPES, db_index=True)
    value = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5 for ratings, null for reactions")
    session_key = models.CharField(max_length=64, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "post_engagements"
        ordering = ["-created_at"]
        verbose_name = "post engagement"
        verbose_name_plural = "post engagements"
        constraints = [
            models.UniqueConstraint(
                fields=["blog_post", "engagement_type", "session_key"],
                name="unique_engagement_per_session",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.engagement_type} on '{self.blog_post.title}' ({self.session_key[:8]})"


class VideoResource(BaseModel):
    """Educational video resource for the practice's public videoteca."""

    CATEGORY_CHOICES = [
        ("URGENCIAS", "Urgencias"),
        ("LACTANCIA", "Lactancia"),
        ("ALIMENTACION", "Alimentación"),
        ("SUENO", "Sueño"),
        ("PRIMEROS_AUXILIOS", "Primeros auxilios"),
        ("DESARROLLO", "Desarrollo"),
        ("CONSEJOS", "Consejos"),
    ]

    practice = models.ForeignKey(
        "practice.Practice",
        on_delete=models.CASCADE,
        related_name="videos",
        verbose_name=_("practice"),
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="videos",
        verbose_name=_("author"),
    )
    title = models.CharField(_("title"), max_length=255)
    slug = models.SlugField(_("slug"), max_length=255, unique=True)
    youtube_url = models.URLField(
        _("YouTube URL"),
        help_text=_("Full YouTube video URL (e.g. https://www.youtube.com/watch?v=XXXXX)"),
    )
    description = models.TextField(_("description"), blank=True)
    category = models.CharField(_("category"), max_length=20, choices=CATEGORY_CHOICES, db_index=True)
    duration_seconds = models.PositiveIntegerField(
        _("duration (seconds)"),
        default=0,
        help_text=_("Video duration in seconds"),
    )
    chapters = models.JSONField(
        _("chapters"),
        default=list,
        blank=True,
        help_text=_("List of {time_seconds, label} objects"),
    )
    thumbnail = models.ImageField(_("thumbnail"), upload_to="videos/thumbnails/", blank=True)
    video_number = models.PositiveIntegerField(
        _("video number"),
        null=True,
        blank=True,
        unique=True,
        help_text=_("Auto-assigned on first publish."),
    )
    is_published = models.BooleanField(_("published"), default=False)
    published_at = models.DateTimeField(_("published at"), null=True, blank=True)
    view_count = models.PositiveIntegerField(_("view count"), default=0)

    class Meta:
        db_table = "video_resources"
        ordering = ["-published_at", "-created_at"]
        verbose_name = _("video resource")
        verbose_name_plural = _("video resources")

    def __str__(self) -> str:
        return self.title

    def publish(self) -> None:
        """Mark this video as published. Sets published_at and video_number on first publish."""
        self.is_published = True
        if self.published_at is None:
            self.published_at = timezone.now()
        if self.video_number is None:
            last = (
                VideoResource.objects.filter(video_number__isnull=False)
                .order_by("-video_number")
                .values_list("video_number", flat=True)
                .first()
            )
            self.video_number = (last or 0) + 1
        self.save(update_fields=["is_published", "published_at", "video_number", "updated_at"])

    def unpublish(self) -> None:
        """Retract this video from public visibility."""
        self.is_published = False
        self.save(update_fields=["is_published", "updated_at"])

    @property
    def youtube_embed_url(self) -> str:
        """Extract YouTube video ID and return embed URL."""
        import re

        pattern = r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})"
        match = re.search(pattern, self.youtube_url)
        if match:
            return f"https://www.youtube.com/embed/{match.group(1)}"
        return self.youtube_url

    @property
    def duration_formatted(self) -> str:
        """Return duration as M:SS string."""
        m, s = divmod(self.duration_seconds, 60)
        return f"{m}:{s:02d}"
