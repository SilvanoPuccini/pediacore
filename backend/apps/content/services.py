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

if TYPE_CHECKING:
    from apps.content.models import BlogPost, Subscriber

logger = logging.getLogger(__name__)

_DOMAIN = "https://estefipediatra.com"
_LOGO_URL = f"{_DOMAIN}/images/logofinal.png"


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
# Shared email shell — matches the appointment email system
# ---------------------------------------------------------------------------

_FONT_STACK = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
_DISPLAY_FONT = "'Fraunces',Georgia,'Times New Roman',serif"


def _email_shell(title: str, body_html: str, unsub_url: str) -> str:
    """Wrap body_html in the branded header + footer used by all PEDIACORE emails."""
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>{title}</title>
    <!--[if !mso]><!-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap');
    </style>
    <!--<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#FBF8F3;" bgcolor="#FBF8F3">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FBF8F3;" bgcolor="#FBF8F3">
        <tr>
            <td align="center" style="padding:32px 16px;" bgcolor="#FBF8F3">

                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:12px; overflow:hidden;" bgcolor="#FFFFFF">

                    <!-- Header: brand bar -->
                    <tr>
                        <td style="background-color:#4A8590; padding:32px 40px; text-align:center;" bgcolor="#4A8590">
                            <div style="width:120px; height:120px; border-radius:50%; overflow:hidden; margin:0 auto; background-color:#ffffff; border:3px solid rgba(255,255,255,0.2);">
                                <img src="{_LOGO_URL}" alt="Dra. Estefi Pediatra" width="120" style="display:block; width:120px; height:auto; margin:0 auto;">
                            </div>
                            <h1 style="font-family:{_DISPLAY_FONT}; color:#FFFFFF; margin:14px 0 0; font-size:22px; font-weight:600;">Dra. Estefi</h1>
                            <p style="font-family:{_FONT_STACK}; color:rgba(255,255,255,0.75); margin:4px 0 0; font-size:12px; letter-spacing:0.5px;">Pediatra &middot; Sur de Chile</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px 0;" bgcolor="#FFFFFF">
                            {body_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#2C2C2C; padding:28px 40px; text-align:center;" bgcolor="#2C2C2C">
                            <div style="width:80px; height:80px; border-radius:50%; overflow:hidden; margin:0 auto 12px; background-color:#ffffff; border:2px solid rgba(255,255,255,0.2);">
                                <img src="{_LOGO_URL}" alt="" width="80" style="display:block; width:80px; height:auto; margin:0 auto;">
                            </div>
                            <p style="font-family:{_FONT_STACK}; color:rgba(255,255,255,0.9); font-size:13px; margin:0 0 4px; font-weight:600;">Dra. Estefi</p>
                            <p style="font-family:{_FONT_STACK}; color:rgba(255,255,255,0.6); font-size:12px; margin:0 0 20px;">Pediatr&iacute;a con tiempo, calidez y atenci&oacute;n personalizada</p>
                            <p style="font-family:{_FONT_STACK}; font-size:12px; color:rgba(255,255,255,0.7); line-height:1.8; margin:0 0 16px;">
                                Puc&oacute;n &amp; Villarrica &middot; La Araucan&iacute;a, Chile<br>
                                <a href="tel:+56958455537" style="color:#7BB5BD; text-decoration:none;">+56 9 5845 5537</a>
                                &nbsp;&middot;&nbsp;
                                <a href="mailto:estefiortigosa.pediatra@gmail.com" style="color:#7BB5BD; text-decoration:none;">estefiortigosa.pediatra@gmail.com</a>
                            </p>
                            <p style="font-family:{_FONT_STACK}; font-size:12px; margin:0 0 16px;">
                                <a href="https://www.instagram.com/estefiortigosa.pediatra/" style="color:#7BB5BD; text-decoration:none; margin:0 8px;">Instagram</a>
                                <a href="https://estefipediatra.com" style="color:#7BB5BD; text-decoration:none; margin:0 8px;">Web</a>
                            </p>
                            <p style="font-family:{_FONT_STACK}; font-size:11px; color:rgba(255,255,255,0.5); margin:0 0 4px;">
                                Recib&iacute;s este email porque te suscribiste en estefipediatra.com
                            </p>
                            <p style="font-family:{_FONT_STACK}; font-size:11px; margin:0;">
                                <a href="{unsub_url}" style="color:#7BB5BD; text-decoration:underline;">Darme de baja</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Email senders
# ---------------------------------------------------------------------------


def send_welcome_email(subscriber: Subscriber) -> None:
    """Send a welcome email to a newly subscribed visitor."""
    from apps.notifications.services.email_service import send_email

    unsubscribe_url = get_unsubscribe_url(subscriber.email)
    greeting = f"Hola <strong>{subscriber.name}</strong>," if subscriber.name else "Hola,"

    body_html = f"""
            <p style="font-family:{_FONT_STACK}; color:#2C2C2C; font-size:16px; line-height:1.6; margin:0 0 16px;">
                {greeting}
            </p>
            <p style="font-family:{_FONT_STACK}; color:#2C2C2C; font-size:16px; line-height:1.6; margin:0 0 16px;">
                &iexcl;Te damos la bienvenida al newsletter de Estefan&iacute;a!
                A partir de ahora vas a recibir art&iacute;culos sobre salud pedi&aacute;trica,
                consejos para familias y novedades del consultorio.
            </p>
            <p style="font-family:{_FONT_STACK}; color:#2C2C2C; font-size:16px; line-height:1.6; margin:0 0 32px;">
                Mientras tanto, pod&eacute;s explorar nuestro blog con art&iacute;culos ya publicados.
            </p>

            <!-- CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                    <td style="border-radius:8px; background-color:#4A8590;">
                        <a href="{_DOMAIN}/blog"
                           style="display:inline-block; padding:14px 28px; color:#FFFFFF;
                                  font-family:{_FONT_STACK}; font-size:15px; font-weight:600;
                                  text-decoration:none; border-radius:8px;">
                            Ver el blog
                        </a>
                    </td>
                </tr>
            </table>

            <br/>
            <p style="font-family:{_FONT_STACK}; text-align:center; font-size:11px; color:#A0A0A0; margin:0 0 12px;">
                Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.
            </p>
"""

    html_body = _email_shell("Bienvenida al newsletter", body_html, unsubscribe_url)

    send_email(
        to=subscriber.email,
        subject="Bienvenida al newsletter de Estefanía",
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
                f'color:#1E7A6E;font-family:{_FONT_STACK};font-size:12px;font-weight:600;padding:4px 12px;'
                f'border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">'
                f"{first_tag}</span><br/><br/>"
            )

        excerpt_html = ""
        if blog_post.excerpt:
            excerpt_html = (
                f'<p style="margin:0 0 24px;font-family:{_FONT_STACK};font-size:15px;color:#555555;line-height:1.7;">'
                f"{blog_post.excerpt}</p>"
            )

        post_url = f"{_DOMAIN}/blog/{blog_post.slug}"

        body_html = f"""
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td style="text-align:center; padding:0 0 24px;" bgcolor="#FFFFFF">
                        <p style="font-family:{_FONT_STACK}; font-size:12px; text-transform:uppercase;
                                  letter-spacing:2px; color:#6b7280; font-weight:700; margin:0;">
                            Nuevo art&iacute;culo
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 0 32px;" bgcolor="#FFFFFF">
                        {tag_html}
                        <h2 style="margin:0 0 16px;font-family:{_DISPLAY_FONT};font-size:22px;color:#2C2C2C;line-height:1.3;font-weight:700;">
                            {blog_post.title}
                        </h2>
                        {excerpt_html}

                        <!-- CTA -->
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="border-radius:8px; background-color:#4A8590;">
                                    <a href="{post_url}"
                                       style="display:inline-block; padding:14px 28px; color:#FFFFFF;
                                              font-family:{_FONT_STACK}; font-size:15px; font-weight:600;
                                              text-decoration:none; border-radius:8px;">
                                        Leer art&iacute;culo
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="text-align:center; padding:0 0 12px;" bgcolor="#FFFFFF">
                        <p style="font-family:{_FONT_STACK}; font-size:11px; color:#A0A0A0; margin:0;">
                            Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.
                        </p>
                    </td>
                </tr>
            </table>
"""

        return _email_shell(f"Nuevo artículo — {blog_post.title}", body_html, unsubscribe_url)

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
