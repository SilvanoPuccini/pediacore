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
        """Mark this post as published. Sets published_at only on first publish."""
        self.is_published = True
        if self.published_at is None:
            self.published_at = timezone.now()
        self.save(update_fields=["is_published", "published_at", "updated_at"])

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
