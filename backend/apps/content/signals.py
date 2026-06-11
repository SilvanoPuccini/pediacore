"""
Django signals for the content app.

Automatically triggers newsletter notifications when a blog post
transitions from draft to published.
"""

from __future__ import annotations

from django.db.models.signals import pre_save
from django.dispatch import receiver

from apps.content.models import BlogPost


@receiver(pre_save, sender=BlogPost)
def notify_subscribers_on_publish(sender: type[BlogPost], instance: BlogPost, **kwargs) -> None:
    """
    Fire a newsletter notification when a blog post is first published.

    Only triggers on the draft → published transition, not on subsequent
    saves of already-published posts.
    """
    if instance.pk:
        try:
            old = BlogPost.objects.get(pk=instance.pk)
            if not old.is_published and instance.is_published:
                from django_q.tasks import async_task

                async_task("apps.content.services.send_blog_notification", instance)
        except BlogPost.DoesNotExist:
            pass
