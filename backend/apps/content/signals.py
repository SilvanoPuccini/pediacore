"""
Django signals for the content app.

Automatically triggers newsletter notifications when a blog post
or video transitions from draft to published.
"""

from __future__ import annotations

import logging

from django.db.models.signals import pre_save
from django.dispatch import receiver

from apps.content.models import BlogPost, VideoResource

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=BlogPost)
def notify_subscribers_on_publish(sender: type[BlogPost], instance: BlogPost, **kwargs) -> None:
    """
    Fire a newsletter notification when a blog post is first published.

    Only triggers on the draft → published transition, not on subsequent
    saves of already-published posts. Passes pk (not instance) to avoid
    serialization issues with django-q2.
    """
    if instance.pk:
        try:
            old = BlogPost.objects.get(pk=instance.pk)
            if not old.is_published and instance.is_published:
                from django_q.tasks import async_task

                async_task("apps.content.services.send_blog_notification", instance.pk)
        except BlogPost.DoesNotExist:
            pass
        except Exception:
            logger.exception("Failed to queue blog notification for post %s", instance.pk)


@receiver(pre_save, sender=VideoResource)
def notify_subscribers_on_video_publish(sender: type[VideoResource], instance: VideoResource, **kwargs) -> None:
    """
    Fire a notification when a video is first published.

    Only triggers on the draft → published transition.
    """
    if instance.pk:
        try:
            old = VideoResource.objects.get(pk=instance.pk)
            if not old.is_published and instance.is_published:
                from django_q.tasks import async_task

                async_task("apps.content.services.send_video_notification", instance.pk)
        except VideoResource.DoesNotExist:
            pass
        except Exception:
            logger.exception("Failed to queue video notification for video %s", instance.pk)
