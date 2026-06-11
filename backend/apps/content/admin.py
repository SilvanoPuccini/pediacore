"""
Django admin configuration for the content app.
"""

from __future__ import annotations

from django.contrib import admin
from django_ckeditor_5.widgets import CKEditor5Widget
from unfold.admin import ModelAdmin

from apps.content.models import FAQ, BlogPost, NewsletterSent, Page, PostEngagement, Subscriber


class BlogPostAdminForm(admin.options.forms.ModelForm):
    class Meta:
        model = BlogPost
        fields = "__all__"
        widgets = {
            "content": CKEditor5Widget(config_name="default"),
        }


@admin.register(BlogPost)
class BlogPostAdmin(ModelAdmin):
    form = BlogPostAdminForm
    list_display = ["post_number", "title", "author", "practice", "is_published", "published_at", "created_at"]
    list_filter = ["is_published", "practice"]
    search_fields = ["title", "excerpt", "tags"]
    prepopulated_fields = {"slug": ("title",)}
    list_select_related = ["author", "practice"]
    readonly_fields = ["created_at", "updated_at", "deleted_at", "published_at", "post_number"]
    date_hierarchy = "published_at"
    fieldsets = [
        (None, {"fields": ["practice", "author", "title", "slug", "excerpt"]}),
        ("Content", {"fields": ["content", "cover_image"]}),
        ("Publishing", {"fields": ["is_published", "published_at", "post_number", "tags", "meta_description"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]

    actions = ["publish_posts", "unpublish_posts"]

    @admin.action(description="Publish selected blog posts")
    def publish_posts(self, request, queryset):
        for post in queryset:
            post.publish()

    @admin.action(description="Unpublish selected blog posts")
    def unpublish_posts(self, request, queryset):
        for post in queryset:
            post.unpublish()


@admin.register(Page)
class PageAdmin(ModelAdmin):
    list_display = ["title", "slug", "practice", "order", "is_published", "created_at"]
    list_filter = ["is_published", "practice"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    list_editable = ["order"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["practice", "title", "slug", "order"]}),
        ("Content", {"fields": ["content", "meta_description"]}),
        ("Publishing", {"fields": ["is_published"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(FAQ)
class FAQAdmin(ModelAdmin):
    list_display = ["question", "practice", "order", "is_published", "created_at"]
    list_filter = ["is_published", "practice"]
    search_fields = ["question", "answer"]
    list_editable = ["order"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["practice", "question", "answer", "order"]}),
        ("Publishing", {"fields": ["is_published"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(Subscriber)
class SubscriberAdmin(ModelAdmin):
    list_display = ["email", "name", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["email", "name"]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["email", "name", "status"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(NewsletterSent)
class NewsletterSentAdmin(ModelAdmin):
    list_display = ["blog_post", "recipients_count", "sent_at", "created_at"]
    list_select_related = ["blog_post"]
    readonly_fields = ["blog_post", "recipients_count", "sent_at", "created_at", "updated_at", "deleted_at"]
    fieldsets = [
        (None, {"fields": ["blog_post", "recipients_count", "sent_at"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at", "deleted_at"], "classes": ["collapse"]}),
    ]


@admin.register(PostEngagement)
class PostEngagementAdmin(ModelAdmin):
    list_display = ["blog_post", "engagement_type", "value", "session_key", "created_at"]
    list_filter = ["engagement_type"]
    list_select_related = ["blog_post"]
    search_fields = ["blog_post__title", "session_key"]
    readonly_fields = ["blog_post", "engagement_type", "value", "session_key", "ip_address", "created_at", "updated_at", "deleted_at"]
