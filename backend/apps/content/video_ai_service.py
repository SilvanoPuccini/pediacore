"""
AI-powered metadata generation for video resources using Gemini.

Given a YouTube URL, fetches the video title via oEmbed and asks Gemini
to suggest: description, category, and chapters — tailored to a
pediatric practice context.
"""

from __future__ import annotations

import json
import logging
import re
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings

logger = logging.getLogger(__name__)

CATEGORY_CHOICES = [
    "URGENCIAS",
    "LACTANCIA",
    "ALIMENTACION",
    "SUENO",
    "PRIMEROS_AUXILIOS",
    "DESARROLLO",
    "CONSEJOS",
]

PROMPT_TEMPLATE = """Eres asistente de una pediatra chilena que sube videos educativos a YouTube.
Dado el título del video, genera metadata en JSON con estos campos exactos:

- "description": texto descriptivo de 2-3 oraciones para mostrar debajo del video (español neutro latinoamericano, sin emojis, dirigido a padres)
- "category": UNA de estas opciones exactas: {categories}
- "chapters": array de 4-6 objetos con "time_seconds" (int, estimado, distribuidos uniformemente en {duration} segundos) y "label" (string corto en español)

Título del video: "{title}"
Duración total: {duration} segundos

Responde SOLO con el JSON válido, sin markdown ni explicación."""


def fetch_youtube_title(youtube_url: str) -> str | None:
    """Fetch video title via YouTube oEmbed (free, no API key needed)."""
    try:
        oembed_url = "https://www.youtube.com/oembed?" + urlencode(
            {"url": youtube_url, "format": "json"}
        )
        with urlopen(oembed_url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data.get("title")
    except Exception as exc:
        logger.warning("fetch_youtube_title: oEmbed failed for %s: %s", youtube_url, exc)
        return None


def autofill_video_metadata(
    youtube_url: str,
    title: str = "",
    duration_seconds: int = 0,
) -> dict | None:
    """
    Generate video metadata using Gemini.

    Parameters
    ----------
    youtube_url : str
        The YouTube video URL.
    title : str
        Video title. If empty, fetched from YouTube oEmbed.
    duration_seconds : int
        Video duration in seconds. Used for chapter timestamp estimation.

    Returns
    -------
    dict | None
        {"description": str, "category": str, "chapters": list} or None on failure.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("autofill_video_metadata: GEMINI_API_KEY not set")
        return None

    # Resolve title from YouTube if not provided
    if not title:
        title = fetch_youtube_title(youtube_url) or ""
    if not title:
        logger.warning("autofill_video_metadata: no title available for %s", youtube_url)
        return None

    duration = duration_seconds or 180  # default 3 min if unknown

    prompt = PROMPT_TEMPLATE.format(
        categories=", ".join(CATEGORY_CHOICES),
        title=title,
        duration=duration,
    )

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")

        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        data = json.loads(raw)

        # Validate and sanitize
        result = {}

        if isinstance(data.get("description"), str) and data["description"]:
            result["description"] = data["description"][:1000]

        if data.get("category") in CATEGORY_CHOICES:
            result["category"] = data["category"]

        chapters = data.get("chapters")
        if isinstance(chapters, list) and len(chapters) >= 2:
            clean_chapters = []
            for ch in chapters[:8]:
                if isinstance(ch, dict) and "time_seconds" in ch and "label" in ch:
                    clean_chapters.append({
                        "time_seconds": int(ch["time_seconds"]),
                        "label": str(ch["label"])[:80],
                    })
            if clean_chapters:
                result["chapters"] = clean_chapters

        if not result:
            logger.warning("autofill_video_metadata: Gemini returned empty/invalid data")
            return None

        logger.info(
            "autofill_video_metadata: generated metadata for '%s' — %d fields",
            title,
            len(result),
        )
        return result

    except json.JSONDecodeError as exc:
        logger.error("autofill_video_metadata: JSON parse error: %s — raw: %r", exc, raw[:300])
        return None
    except Exception as exc:
        logger.error("autofill_video_metadata: Gemini API error: %s", exc)
        return None
