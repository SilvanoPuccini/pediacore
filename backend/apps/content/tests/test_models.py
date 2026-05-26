"""
Tests for content app models.

Covers: creation, str, defaults, slug uniqueness, soft-delete,
publish/unpublish methods, page ordering, FAQ ordering.
"""

from __future__ import annotations

import pytest
from django.utils import timezone

from apps.content.models import FAQ, BlogPost, Page
from tests.factories.content import (
    BlogPostFactory,
    FAQFactory,
    PageFactory,
    PublishedBlogPostFactory,
)


@pytest.mark.django_db
class TestBlogPostModel:
    def test_create_blog_post_with_defaults(self):
        post = BlogPostFactory()
        assert post.pk is not None
        assert post.is_published is False
        assert post.published_at is None
        assert post.tags == ""
        assert post.meta_description == ""

    def test_str_returns_title(self):
        post = BlogPostFactory(title="My First Post")
        assert str(post) == "My First Post"

    def test_slug_is_unique(self):
        BlogPostFactory(slug="unique-slug")
        with pytest.raises(Exception):
            BlogPostFactory(slug="unique-slug")

    def test_soft_delete_hides_post(self):
        post = BlogPostFactory()
        post_id = post.pk
        post.soft_delete()
        assert not BlogPost.objects.filter(pk=post_id).exists()
        assert BlogPost.objects.all_with_deleted().filter(pk=post_id).exists()

    def test_soft_delete_sets_deleted_at(self):
        post = BlogPostFactory()
        assert post.deleted_at is None
        post.soft_delete()
        post.refresh_from_db()
        assert post.deleted_at is not None

    def test_restore_clears_deleted_at(self):
        post = BlogPostFactory()
        post.soft_delete()
        post.restore()
        post.refresh_from_db()
        assert post.deleted_at is None
        assert BlogPost.objects.filter(pk=post.pk).exists()

    def test_publish_sets_is_published_true(self):
        post = BlogPostFactory(is_published=False)
        post.publish()
        post.refresh_from_db()
        assert post.is_published is True

    def test_publish_sets_published_at_on_first_publish(self):
        post = BlogPostFactory(is_published=False, published_at=None)
        before = timezone.now()
        post.publish()
        post.refresh_from_db()
        assert post.published_at is not None
        assert post.published_at >= before

    def test_publish_does_not_overwrite_existing_published_at(self):
        original_time = timezone.now() - timezone.timedelta(days=5)
        post = BlogPostFactory(is_published=False, published_at=original_time)
        post.publish()
        post.refresh_from_db()
        assert post.published_at == original_time

    def test_unpublish_sets_is_published_false(self):
        post = PublishedBlogPostFactory()
        post.unpublish()
        post.refresh_from_db()
        assert post.is_published is False

    def test_ordering_is_published_at_descending(self):
        early = PublishedBlogPostFactory(
            published_at=timezone.now() - timezone.timedelta(days=10)
        )
        recent = PublishedBlogPostFactory(
            published_at=timezone.now()
        )
        posts = list(BlogPost.objects.filter(pk__in=[early.pk, recent.pk]))
        assert posts[0].pk == recent.pk


@pytest.mark.django_db
class TestPageModel:
    def test_create_page_with_defaults(self):
        page = PageFactory()
        assert page.pk is not None
        assert page.is_published is False
        assert page.order == 0 or page.order >= 0

    def test_str_includes_title_and_practice(self):
        page = PageFactory(title="About Us")
        assert "About Us" in str(page)
        assert page.practice.name in str(page)

    def test_slug_unique_per_practice(self):
        page1 = PageFactory(slug="about")
        with pytest.raises(Exception):
            PageFactory(practice=page1.practice, slug="about")

    def test_two_practices_can_share_slug(self):
        page1 = PageFactory(slug="about")
        page2 = PageFactory(slug="about")  # different practice from factory
        assert page1.slug == page2.slug
        assert page1.practice != page2.practice

    def test_ordering_by_order_then_title(self):
        practice = PageFactory().practice
        # detach from DB to create pages with same practice
        from tests.factories.practice import PracticeFactory
        p = PracticeFactory()
        page_b = PageFactory(practice=p, order=2, title="B Page", slug="b-page")
        page_a = PageFactory(practice=p, order=1, title="A Page", slug="a-page")
        pages = list(Page.objects.filter(practice=p))
        assert pages[0].pk == page_a.pk

    def test_soft_delete_removes_from_default_queryset(self):
        page = PageFactory()
        page_id = page.pk
        page.soft_delete()
        assert not Page.objects.filter(pk=page_id).exists()


@pytest.mark.django_db
class TestFAQModel:
    def test_create_faq_with_defaults(self):
        faq = FAQFactory()
        assert faq.pk is not None
        assert faq.is_published is False

    def test_str_returns_question(self):
        faq = FAQFactory(question="Can I book online?")
        assert str(faq) == "Can I book online?"

    def test_ordering_by_order_field(self):
        from tests.factories.practice import PracticeFactory
        p = PracticeFactory()
        faq2 = FAQFactory(practice=p, order=2)
        faq1 = FAQFactory(practice=p, order=1)
        faqs = list(FAQ.objects.filter(practice=p))
        assert faqs[0].pk == faq1.pk

    def test_soft_delete_hides_faq(self):
        faq = FAQFactory()
        faq_id = faq.pk
        faq.soft_delete()
        assert not FAQ.objects.filter(pk=faq_id).exists()
