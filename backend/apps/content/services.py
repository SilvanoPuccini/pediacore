"""
Newsletter services for the content app.

Handles token generation, unsubscribe URL construction, and email
dispatch for both welcome messages and blog post notifications.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import TYPE_CHECKING

from django.conf import settings
from django.urls import reverse

if TYPE_CHECKING:
    from apps.content.models import BlogPost, Subscriber

logger = logging.getLogger(__name__)

_DOMAIN = "https://estefipediatra.com"


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------


def generate_unsubscribe_token(email: str) -> str:
    """Return an HMAC-SHA256 hex digest for the given email address."""
    return hmac.new(settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256).hexdigest()


def get_unsubscribe_url(email: str) -> str:
    """Return the full unsubscribe URL with a signed token for the given email."""
    token = generate_unsubscribe_token(email)
    path = f"/api/v1/content/unsubscribe/?token={token}&email={email}"
    return f"{_DOMAIN}{path}"


# ---------------------------------------------------------------------------
# Email senders
# ---------------------------------------------------------------------------


def send_welcome_email(subscriber: Subscriber) -> None:
    """Send a welcome email to a newly subscribed visitor."""
    from apps.notifications.services.email_service import send_email

    unsubscribe_url = get_unsubscribe_url(subscriber.email)
    greeting = f"Hola {subscriber.name}," if subscriber.name else "Hola,"

    html_body = f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenida al newsletter de Estefanía</title>
</head>
<body style="margin:0;padding:0;background-color:#FDFBF7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFBF7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#FFFFFF;border-radius:12px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2A9D8F;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:0.5px;">
                Estefanía Ortigosa
              </h1>
              <p style="margin:6px 0 0;color:#B2DFD9;font-size:14px;">Pediatría · Pucón &amp; Villarrica</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;line-height:1.6;">
                {greeting}
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#444444;line-height:1.6;">
                ¡Te damos la bienvenida al newsletter de Estefanía!
                A partir de ahora vas a recibir artículos sobre salud pediátrica,
                consejos para familias y novedades del consultorio.
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:#444444;line-height:1.6;">
                Mientras tanto, podés explorar nuestro blog con artículos ya publicados.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background-color:#2A9D8F;">
                    <a href="{_DOMAIN}/blog"
                       style="display:inline-block;padding:14px 28px;color:#FFFFFF;
                              font-size:15px;font-weight:600;text-decoration:none;
                              border-radius:8px;">
                      Ver el blog
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F5F0;padding:24px 40px;text-align:center;
                       border-top:1px solid #E8E8E0;">
              <p style="margin:0 0 8px;font-size:12px;color:#888888;line-height:1.5;">
                Recibís este email porque te suscribiste en estefipediatra.com
              </p>
              <p style="margin:0;font-size:12px;color:#888888;">
                <a href="{unsubscribe_url}"
                   style="color:#2A9D8F;text-decoration:underline;">
                  Darme de baja
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    send_email(
        to=subscriber.email,
        subject="¡Bienvenida al newsletter de Estefanía! 🌿",
        html_body=html_body,
    )


def send_blog_notification(blog_post: BlogPost) -> None:
    """
    Send a blog post notification to all active subscribers.

    For more than 10 subscribers, each email is dispatched as an
    individual django-q2 async task to avoid blocking the caller.
    Creates a NewsletterSent record with the final recipients count.
    """
    from apps.content.models import NewsletterSent, Subscriber
    from apps.notifications.services.email_service import send_email

    subscribers = list(Subscriber.objects.filter(status="ACTIVE"))
    count = len(subscribers)

    if count == 0:
        logger.info("No active subscribers — skipping newsletter for post %s", blog_post.pk)
        return

    def _build_html(subscriber: Subscriber) -> str:
        unsubscribe_url = get_unsubscribe_url(subscriber.email)
        tag_html = ""
        if blog_post.tags:
            first_tag = blog_post.tags.split(",")[0].strip()
            tag_html = (
                f'<span style="display:inline-block;background-color:#E8F5F3;'
                f'color:#1E7A6E;font-size:12px;font-weight:600;padding:4px 12px;'
                f'border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">'
                f"{first_tag}</span><br/><br/>"
            )

        excerpt_html = ""
        if blog_post.excerpt:
            excerpt_html = (
                f'<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">'
                f"{blog_post.excerpt}</p>"
            )

        post_url = f"{_DOMAIN}/blog/{blog_post.slug}"

        return f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuevo artículo — {blog_post.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#FDFBF7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFBF7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#FFFFFF;border-radius:12px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2A9D8F;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:0.5px;">
                Estefanía Ortigosa
              </h1>
              <p style="margin:6px 0 0;color:#B2DFD9;font-size:14px;">Pediatría · Pucón &amp; Villarrica</p>
            </td>
          </tr>

          <!-- Label -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#888888;text-transform:uppercase;
                        letter-spacing:1px;font-weight:600;">Nuevo artículo</p>
            </td>
          </tr>

          <!-- Post card -->
          <tr>
            <td style="padding:16px 40px 32px;">
              {tag_html}
              <h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a;line-height:1.3;font-weight:700;">
                {blog_post.title}
              </h2>
              {excerpt_html}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background-color:#2A9D8F;">
                    <a href="{post_url}"
                       style="display:inline-block;padding:14px 28px;color:#FFFFFF;
                              font-size:15px;font-weight:600;text-decoration:none;
                              border-radius:8px;">
                      Leer artículo
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F5F0;padding:24px 40px;text-align:center;
                       border-top:1px solid #E8E8E0;">
              <p style="margin:0 0 8px;font-size:12px;color:#888888;line-height:1.5;">
                Recibís este email porque te suscribiste en estefipediatra.com
              </p>
              <p style="margin:0;font-size:12px;color:#888888;">
                <a href="{unsubscribe_url}"
                   style="color:#2A9D8F;text-decoration:underline;">
                  Darme de baja
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    subject = f"Nuevo artículo: {blog_post.title}"

    if count > 10:
        from django_q.tasks import async_task

        for subscriber in subscribers:
            html_body = _build_html(subscriber)
            async_task(
                "apps.notifications.services.email_service.send_email",
                subscriber.email,
                subject,
                html_body,
            )
    else:
        for subscriber in subscribers:
            html_body = _build_html(subscriber)
            try:
                send_email(to=subscriber.email, subject=subject, html_body=html_body)
            except Exception:
                logger.exception("Failed to send newsletter to %s", subscriber.email)

    NewsletterSent.objects.create(blog_post=blog_post, recipients_count=count)
    logger.info("Newsletter sent for post %s to %d subscribers", blog_post.pk, count)
