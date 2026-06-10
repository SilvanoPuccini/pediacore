"""
Django admin configuration for the content app.
"""

from __future__ import annotations

from django.contrib import admin
from django_ckeditor_5.widgets import CKEditor5Widget
from unfold.admin import ModelAdmin

from apps.content.models import FAQ, BlogPost, Page


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
    list_display = ["title", "author", "practice", "is_published", "published_at", "created_at"]
    list_filter = ["is_published", "practice"]
    search_fields = ["title", "excerpt", "tags"]
    prepopulated_fields = {"slug": ("title",)}
    list_select_related = ["author", "practice"]
    readonly_fields = ["created_at", "updated_at", "deleted_at", "published_at"]
    date_hierarchy = "published_at"
    fieldsets = [
        (None, {"fields": ["practice", "author", "title", "slug", "excerpt"]}),
        ("Content", {"fields": ["content", "cover_image"]}),
        ("Publishing", {"fields": ["is_published", "published_at", "tags", "meta_description"]}),
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
