from __future__ import annotations

import factory

from apps.notifications.models import EmailLog, Notification, NotificationPreference
from tests.factories.practice import PracticeFactory
from tests.factories.users import UserFactory


class NotificationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Notification

    practice = factory.SubFactory(PracticeFactory)
    recipient = factory.SubFactory(UserFactory)
    notification_type = Notification.GENERAL
    title = factory.Sequence(lambda n: f"Notification {n}")
    message = factory.Faker("sentence")
    is_read = False
    related_type = ""
    related_id = None


class EmailLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EmailLog

    practice = factory.SubFactory(PracticeFactory)
    recipient_email = factory.Faker("email")
    subject = factory.Sequence(lambda n: f"Email subject {n}")
    body_preview = "Preview text"
    status = EmailLog.QUEUED
    provider = "resend"
    external_id = ""
    error_message = ""
    sent_at = None


class NotificationPreferenceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = NotificationPreference
        django_get_or_create = ("user",)

    practice = factory.SubFactory(PracticeFactory)
    user = factory.SubFactory(UserFactory)
