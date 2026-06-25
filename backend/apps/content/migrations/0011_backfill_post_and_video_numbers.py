"""
Data migration: backfill post_number and video_number for already-published
BlogPost and VideoResource records that were published before the save()
override was introduced.
"""

from django.db import migrations


def backfill_post_numbers(apps, schema_editor):
    BlogPost = apps.get_model("content", "BlogPost")

    # Find the current max to avoid collisions with already-numbered posts.
    from django.db.models import Max

    max_existing = BlogPost.objects.filter(post_number__isnull=False).aggregate(Max("post_number"))["post_number__max"] or 0

    unnumbered = BlogPost.objects.filter(
        is_published=True,
        post_number__isnull=True,
    ).order_by(
        # Prefer published_at; fall back to created_at for posts that lack it.
        "published_at",
        "created_at",
    )

    counter = max_existing + 1
    for post in unnumbered:
        post.post_number = counter
        post.save(update_fields=["post_number"])
        counter += 1


def backfill_video_numbers(apps, schema_editor):
    VideoResource = apps.get_model("content", "VideoResource")

    from django.db.models import Max

    max_existing = VideoResource.objects.filter(video_number__isnull=False).aggregate(Max("video_number"))["video_number__max"] or 0

    unnumbered = VideoResource.objects.filter(
        is_published=True,
        video_number__isnull=True,
    ).order_by(
        "published_at",
        "created_at",
    )

    counter = max_existing + 1
    for video in unnumbered:
        video.video_number = counter
        video.save(update_fields=["video_number"])
        counter += 1


def forwards(apps, schema_editor):
    backfill_post_numbers(apps, schema_editor)
    backfill_video_numbers(apps, schema_editor)


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0010_change_video_thumbnail_to_urlfield"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
