from __future__ import annotations

import factory
from django.utils import timezone

from apps.content.models import FAQ, BlogPost, Page, Subscriber
from tests.factories.practice import PracticeFactory
from tests.factories.users import DoctorFactory


class BlogPostFactory(factory.django.DjangoModelFactory):
    """Factory for creating BlogPost instances in tests."""

    class Meta:
        model = BlogPost

    practice = factory.SubFactory(PracticeFactory)
    author = factory.SubFactory(DoctorFactory)
    title = factory.Sequence(lambda n: f"Blog Post {n}")
    slug = factory.Sequence(lambda n: f"blog-post-{n}")
    excerpt = factory.Faker("text", max_nb_chars=200)
    content = factory.Faker("text", max_nb_chars=2000)
    is_published = False
    published_at = None
    tags = ""
    meta_description = ""


class PublishedBlogPostFactory(BlogPostFactory):
    """Factory that creates an already-published blog post."""

    is_published = True
    published_at = factory.LazyFunction(timezone.now)


class PageFactory(factory.django.DjangoModelFactory):
    """Factory for creating Page instances in tests."""

    class Meta:
        model = Page

    practice = factory.SubFactory(PracticeFactory)
    title = factory.Sequence(lambda n: f"Page {n}")
    slug = factory.Sequence(lambda n: f"page-{n}")
    content = factory.Faker("text", max_nb_chars=1000)
    is_published = False
    order = factory.Sequence(lambda n: n)
    meta_description = ""


class PublishedPageFactory(PageFactory):
    """Factory that creates an already-published static page."""

    is_published = True


class FAQFactory(factory.django.DjangoModelFactory):
    """Factory for creating FAQ instances in tests."""

    class Meta:
        model = FAQ

    practice = factory.SubFactory(PracticeFactory)
    question = factory.Sequence(lambda n: f"Frequently asked question {n}?")
    answer = factory.Faker("text", max_nb_chars=500)
    order = factory.Sequence(lambda n: n)
    is_published = False


class PublishedFAQFactory(FAQFactory):
    """Factory that creates an already-published FAQ."""

    is_published = True


class SubscriberFactory(factory.django.DjangoModelFactory):
    """Factory for creating Subscriber instances in tests."""

    class Meta:
        model = Subscriber

    email = factory.Sequence(lambda n: f"subscriber{n}@example.com")
    name = factory.Faker("first_name")
    status = "ACTIVE"
