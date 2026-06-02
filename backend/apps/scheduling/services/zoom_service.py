"""
Zoom meeting link generation via Server-to-Server OAuth.

Requires env vars: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET.
"""

from __future__ import annotations

import logging
from datetime import datetime

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://zoom.us/oauth/token"
_MEETINGS_URL = "https://api.zoom.us/v2/users/me/meetings"


def _get_access_token() -> str:
    """Obtain a Server-to-Server OAuth access token from Zoom."""
    account_id = getattr(settings, "ZOOM_ACCOUNT_ID", "")
    client_id = getattr(settings, "ZOOM_CLIENT_ID", "")
    client_secret = getattr(settings, "ZOOM_CLIENT_SECRET", "")

    if not all([account_id, client_id, client_secret]):
        raise ValueError("Zoom API credentials not configured.")

    resp = requests.post(
        _TOKEN_URL,
        params={"grant_type": "account_credentials", "account_id": account_id},
        auth=(client_id, client_secret),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def create_zoom_meeting(
    topic: str,
    start_time: datetime,
    duration_minutes: int = 30,
) -> str:
    """Create a Zoom meeting and return the join URL.

    Args:
        topic: Meeting title shown in Zoom.
        start_time: UTC datetime for the meeting.
        duration_minutes: Expected duration (informational, does not auto-end).

    Returns:
        The join_url string for patients to click.

    Raises:
        ValueError: Missing Zoom credentials.
        requests.HTTPError: Zoom API error.
    """
    token = _get_access_token()

    payload = {
        "topic": topic,
        "type": 2,  # Scheduled meeting
        "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration": duration_minutes,
        "timezone": "America/Santiago",
        "settings": {
            "join_before_host": True,
            "waiting_room": True,
            "auto_recording": "none",
            "mute_upon_entry": True,
        },
    }

    resp = requests.post(
        _MEETINGS_URL,
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    resp.raise_for_status()

    join_url = resp.json()["join_url"]
    logger.info("Zoom meeting created: %s", join_url)
    return join_url
