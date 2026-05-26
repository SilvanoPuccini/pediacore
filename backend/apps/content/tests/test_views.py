"""
Tests for content app views.

Covers: public endpoints return only published content, admin CRUD,
publish/unpublish actions, tag filtering, slug lookup, permission enforcement,
and pagination.
"""

from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories.content import (
    BlogPostFactory,
    FAQFactory,
    PageFactory,
    PublishedBlogPostFactory,
    PublishedFAQFactory,
    PublishedPageFactory,
)
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory, UserFactory


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def doctor_client():
    client = APIClient()
    doctor = DoctorFactory()
    client.force_authenticate(user=doctor)
    return client, doctor


@pytest.fixture
def tutor_client():
    client = APIClient()
    tutor = UserFactory()
    client.force_authenticate(user=tutor)
    return client


# ---------------------------------------------------------------------------
# Public blog listing
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPublicBlogList:
    url = reverse("content:public-blog-list")

    def test_returns_only_published_posts(self, api_client):
        PublishedBlogPostFactory()
        BlogPostFactory()  # draft — must not appear
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_returns_200_for_anonymous(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK

    def test_search_by_title(self, api_client):
        PublishedBlogPostFactory(title="Vacunas en la infancia")
        PublishedBlogPostFactory(title="Control de peso")
        response = api_client.get(self.url, {"search": "Vacunas"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert "Vacunas" in response.data["results"][0]["title"]

    def test_filter_by_tag(self, api_client):
        PublishedBlogPostFactory(tags="salud,pediatría")
        PublishedBlogPostFactory(tags="nutrición")
        response = api_client.get(self.url, {"tag": "salud"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_pagination_is_present(self, api_client):
        response = api_client.get(self.url)
        assert "count" in response.data
        assert "results" in response.data


# ---------------------------------------------------------------------------
# Public blog detail
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPublicBlogDetail:
    def test_returns_published_post_by_slug(self, api_client):
        post = PublishedBlogPostFactory(slug="my-post")
        url = reverse("content:public-blog-detail", kwargs={"slug": "my-post"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == "my-post"

    def test_returns_404_for_draft(self, api_client):
        BlogPostFactory(slug="draft-post")
        url = reverse("content:public-blog-detail", kwargs={"slug": "draft-post"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_returns_404_for_nonexistent_slug(self, api_client):
        url = reverse("content:public-blog-detail", kwargs={"slug": "does-not-exist"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Public page detail
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPublicPageDetail:
    def test_returns_published_page_by_slug(self, api_client):
        PublishedPageFactory(slug="about")
        url = reverse("content:public-page-detail", kwargs={"slug": "about"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == "about"

    def test_returns_404_for_unpublished_page(self, api_client):
        PageFactory(slug="hidden-page")
        url = reverse("content:public-page-detail", kwargs={"slug": "hidden-page"})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Public FAQ listing
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPublicFAQList:
    url = reverse("content:public-faqs-list")

    def test_returns_only_published_faqs(self, api_client):
        PublishedFAQFactory()
        FAQFactory()  # draft — must not appear
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_returns_200_for_anonymous(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# Admin blog endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAdminBlogList:
    url = reverse("content:admin-blog-list")

    def test_doctor_can_list_all_posts(self, doctor_client):
        client, doctor = doctor_client
        BlogPostFactory()
        PublishedBlogPostFactory()
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_anon_cannot_access(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tutor_cannot_access(self, tutor_client):
        response = tutor_client.get(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_doctor_can_create_post(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        payload = {
            "practice": practice.pk,
            "title": "New Health Post",
            "content": "Some long content here.",
            "excerpt": "Short excerpt.",
        }
        response = client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["author"] == doctor.pk
        assert response.data["slug"] == "new-health-post"

    def test_auto_slug_generation_from_title(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        payload = {
            "practice": practice.pk,
            "title": "Auto Slug Post",
            "content": "Content.",
        }
        response = client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "auto-slug-post"


@pytest.mark.django_db
class TestAdminBlogPublishUnpublish:
    def test_doctor_can_publish_post(self, doctor_client):
        client, _ = doctor_client
        post = BlogPostFactory(is_published=False)
        url = reverse("content:admin-blog-publish", kwargs={"pk": post.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_published"] is True
        assert response.data["published_at"] is not None

    def test_doctor_can_unpublish_post(self, doctor_client):
        client, _ = doctor_client
        post = PublishedBlogPostFactory()
        url = reverse("content:admin-blog-unpublish", kwargs={"pk": post.pk})
        response = client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_published"] is False

    def test_tutor_cannot_publish(self, tutor_client):
        post = BlogPostFactory()
        url = reverse("content:admin-blog-publish", kwargs={"pk": post.pk})
        response = tutor_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_doctor_can_soft_delete_post(self, doctor_client):
        client, _ = doctor_client
        post = BlogPostFactory()
        url = reverse("content:admin-blog-detail", kwargs={"pk": post.pk})
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        from apps.content.models import BlogPost
        assert not BlogPost.objects.filter(pk=post.pk).exists()


# ---------------------------------------------------------------------------
# Admin pages
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAdminPages:
    url = reverse("content:admin-pages-list")

    def test_doctor_can_list_pages(self, doctor_client):
        client, _ = doctor_client
        PageFactory()
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK

    def test_anon_cannot_list_pages(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_doctor_can_create_page(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        payload = {
            "practice": practice.pk,
            "title": "Contact",
            "slug": "contact",
            "content": "<p>Contact us here.</p>",
        }
        response = client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "contact"

    def test_doctor_can_soft_delete_page(self, doctor_client):
        client, _ = doctor_client
        page = PageFactory()
        url = reverse("content:admin-pages-detail", kwargs={"pk": page.pk})
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        from apps.content.models import Page
        assert not Page.objects.filter(pk=page.pk).exists()


# ---------------------------------------------------------------------------
# Admin FAQs
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAdminFAQs:
    url = reverse("content:admin-faqs-list")

    def test_doctor_can_list_faqs(self, doctor_client):
        client, _ = doctor_client
        FAQFactory()
        response = client.get(self.url)
        assert response.status_code == status.HTTP_200_OK

    def test_anon_cannot_list_faqs(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_doctor_can_create_faq(self, doctor_client):
        client, doctor = doctor_client
        practice = PracticeFactory(owner=doctor)
        payload = {
            "practice": practice.pk,
            "question": "Do you accept walk-ins?",
            "answer": "Yes, for emergencies.",
            "order": 1,
        }
        response = client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["question"] == "Do you accept walk-ins?"

    def test_doctor_can_soft_delete_faq(self, doctor_client):
        client, _ = doctor_client
        faq = FAQFactory()
        url = reverse("content:admin-faqs-detail", kwargs={"pk": faq.pk})
        response = client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        from apps.content.models import FAQ
        assert not FAQ.objects.filter(pk=faq.pk).exists()
