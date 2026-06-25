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
    from apps.content.models import BlogPost, Subscriber, VideoResource

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


def send_blog_notification(blog_post_pk: int) -> None:
    """
    Send a blog post notification to all active subscribers.

    Accepts pk (not instance) so django-q2 can serialize safely.
    For more than 10 subscribers, each email is dispatched as an
    individual django-q2 async task to avoid blocking the caller.
    Creates a NewsletterSent record with the final recipients count.
    """
    from apps.content.models import BlogPost, NewsletterSent, Subscriber
    from apps.notifications.services.email_service import send_email

    blog_post = BlogPost.objects.select_related("author").get(pk=blog_post_pk)

    subscribers = list(Subscriber.objects.filter(status="ACTIVE"))
    count = len(subscribers)

    if count == 0:
        logger.info("No active subscribers — skipping newsletter for post %s", blog_post.pk)
        return

    def _build_html(subscriber: Subscriber) -> str:
        unsubscribe_url = get_unsubscribe_url(subscriber.email)
        post_url = f"{_DOMAIN}/blog/{blog_post.slug}"
        greeting = f"{subscriber.name}" if subscriber.name else ""

        # Article number badge
        number_label = ""
        if blog_post.post_number:
            number_label = (
                f'<span style="display:inline-block;background-color:#4A8590;color:#FFFFFF;'
                f"font-family:{_FONT_STACK};font-size:11px;font-weight:700;padding:4px 14px;"
                f'border-radius:20px;letter-spacing:1px;text-transform:uppercase;">'
                f"Art&iacute;culo #{blog_post.post_number}</span>"
            )

        # Tags
        tags_html = ""
        if blog_post.tags:
            tag_spans = []
            for tag in blog_post.tags.split(",")[:3]:
                tag = tag.strip()
                if tag:
                    tag_spans.append(
                        f'<span style="display:inline-block;background-color:#E8F5F3;'
                        f"color:#1E7A6E;font-family:{_FONT_STACK};font-size:11px;font-weight:600;"
                        f'padding:3px 10px;border-radius:14px;margin-right:6px;">'
                        f"{tag}</span>"
                    )
            if tag_spans:
                tags_html = "".join(tag_spans)

        # Cover image
        cover_html = ""
        if blog_post.cover_image:
            cover_html = (
                f'<tr><td style="padding:0;" bgcolor="#FFFFFF">'
                f'<a href="{post_url}" style="text-decoration:none;">'
                f'<img src="{_DOMAIN}{blog_post.cover_image.url}" alt="{blog_post.title}" '
                f'width="520" style="display:block;width:100%;max-width:520px;height:auto;'
                f'border-radius:10px;margin:0 auto;" />'
                f"</a></td></tr>"
                f'<tr><td style="padding:16px 0 0;" bgcolor="#FFFFFF"></td></tr>'
            )

        # Excerpt
        excerpt_html = ""
        if blog_post.excerpt:
            excerpt_html = (
                f'<p style="margin:0 0 28px;font-family:{_FONT_STACK};font-size:15px;'
                f'color:#555555;line-height:1.7;">{blog_post.excerpt}</p>'
            )

        # Published date
        date_html = ""
        if blog_post.published_at:
            from django.utils.formats import date_format as django_date_format

            formatted = django_date_format(blog_post.published_at, "j \\d\\e F, Y")
            date_html = (
                f'<span style="font-family:{_FONT_STACK};font-size:12px;color:#9CA3AF;">'
                f"{formatted}</span>"
            )

        # Greeting
        greeting_html = ""
        if greeting:
            greeting_html = (
                f'<p style="font-family:{_FONT_STACK};color:#2C2C2C;font-size:15px;'
                f'line-height:1.6;margin:0 0 4px;">Hola <strong>{greeting}</strong>,</p>'
            )

        # Edition header
        edition_html = ""
        if blog_post.post_number:
            edition_html = (
                f'<p style="font-family:{_FONT_STACK};font-size:11px;font-weight:700;'
                f'letter-spacing:2px;text-transform:uppercase;color:#4A8590;margin:0 0 6px;'
                f'text-align:center;">Newsletter</p>'
                f'<p style="font-family:{_DISPLAY_FONT};font-size:28px;font-weight:600;'
                f'color:#2C2C2C;margin:0 0 4px;text-align:center;">'
                f'Edici&oacute;n #{blog_post.post_number}</p>'
            )

        body_html = f"""
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">

                <!-- Edition header -->
                {'<tr><td style="padding:0 0 20px;text-align:center;" bgcolor="#FFFFFF">' + edition_html + '</td></tr>' if edition_html else ''}

                <!-- Gradient divider -->
                <tr>
                    <td style="padding:0 0 24px;" bgcolor="#FFFFFF">
                        <div style="height:2px;background:linear-gradient(to right,#E8F5F3,#4A8590,#E8F5F3);"></div>
                    </td>
                </tr>

                <!-- Greeting + intro -->
                <tr>
                    <td style="padding:0 0 20px;" bgcolor="#FFFFFF">
                        {greeting_html}
                        <p style="font-family:{_FONT_STACK};color:#6B7280;font-size:14px;line-height:1.6;margin:0;">
                            &iexcl;Tenemos un nuevo art&iacute;culo para vos!
                        </p>
                    </td>
                </tr>

                <!-- Article card -->
                <tr>
                    <td style="padding:0 0 28px;" bgcolor="#FFFFFF">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                               style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;background-color:#FAFAFA;"
                               bgcolor="#FAFAFA">

                            <!-- Cover image inside card -->
                            {'<tr><td style="padding:0;" bgcolor="#FAFAFA"><a href="' + post_url + '" style="text-decoration:none;"><img src="' + _DOMAIN + blog_post.cover_image.url + '" alt="' + blog_post.title + '" width="520" style="display:block;width:100%;height:auto;border-radius:12px 12px 0 0;" /></a></td></tr>' if blog_post.cover_image else ''}

                            <!-- Card body -->
                            <tr>
                                <td style="padding:24px 28px 28px;" bgcolor="#FAFAFA">

                                    <!-- Number badge — centered, prominent -->
                                    {'<p style="text-align:center;margin:0 0 16px;"><span style="display:inline-block;background-color:#4A8590;color:#FFFFFF;font-family:' + _FONT_STACK + ';font-size:13px;font-weight:700;padding:6px 20px;border-radius:24px;letter-spacing:1.5px;text-transform:uppercase;">Art&iacute;culo #' + str(blog_post.post_number) + '</span></p>' if blog_post.post_number else ''}

                                    <!-- Tags -->
                                    {'<p style="margin:0 0 14px;">' + tags_html + '</p>' if tags_html else ''}

                                    <!-- Title -->
                                    <a href="{post_url}" style="text-decoration:none;">
                                        <h2 style="margin:0 0 10px;font-family:{_DISPLAY_FONT};font-size:26px;
                                                   color:#2C2C2C;line-height:1.3;font-weight:600;">
                                            {blog_post.title}
                                        </h2>
                                    </a>

                                    <!-- Date + byline -->
                                    <p style="margin:0 0 18px;">
                                        {date_html}
                                        {'&nbsp;&middot;&nbsp;<span style="font-family:' + _FONT_STACK + ';font-size:12px;color:#9CA3AF;">Por Dra. Estefan&iacute;a Ortigosa &mdash; Pediatra</span>' if date_html else '<span style="font-family:' + _FONT_STACK + ';font-size:12px;color:#9CA3AF;">Por Dra. Estefan&iacute;a Ortigosa &mdash; Pediatra</span>'}
                                    </p>

                                    <!-- Excerpt -->
                                    {excerpt_html}

                                    <!-- CTA button -->
                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td style="text-align:center;padding:8px 0 0;">
                                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                                                    <tr>
                                                        <td style="border-radius:10px;background-color:#4A8590;
                                                                   border-bottom:3px solid #3A6F7A;">
                                                            <a href="{post_url}"
                                                               style="display:inline-block;padding:16px 48px;color:#FFFFFF;
                                                                      font-family:{_FONT_STACK};font-size:15px;font-weight:700;
                                                                      text-decoration:none;border-radius:10px;
                                                                      letter-spacing:0.3px;">
                                                                Leer art&iacute;culo completo &rarr;
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>

                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Gradient divider -->
                <tr>
                    <td style="padding:0 0 20px;" bgcolor="#FFFFFF">
                        <div style="height:1px;background:linear-gradient(to right,#E8F5F3,#4A8590,#E8F5F3);"></div>
                    </td>
                </tr>

                <!-- Blog link -->
                <tr>
                    <td style="text-align:center;padding:0 0 12px;" bgcolor="#FFFFFF">
                        <p style="font-family:{_FONT_STACK};font-size:13px;color:#6B7280;margin:0 0 4px;">
                            &iquest;Quer&eacute;s leer m&aacute;s?
                        </p>
                        <a href="{_DOMAIN}/blog"
                           style="font-family:{_FONT_STACK};font-size:13px;color:#4A8590;
                                  font-weight:600;text-decoration:none;">
                            Visit&aacute; el blog &rarr;
                        </a>
                    </td>
                </tr>

                <!-- Auto-email notice -->
                <tr>
                    <td style="text-align:center; padding:8px 0 12px;" bgcolor="#FFFFFF">
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


# ---------------------------------------------------------------------------
# Video notification
# ---------------------------------------------------------------------------

_VIDEO_CATEGORIES: dict[str, str] = {
    "URGENCIAS": "Urgencias",
    "LACTANCIA": "Lactancia",
    "ALIMENTACION": "Alimentaci\u00f3n",
    "SUENO": "Sue\u00f1o",
    "PRIMEROS_AUXILIOS": "Primeros auxilios",
    "DESARROLLO": "Desarrollo",
    "CONSEJOS": "Consejos",
}


def send_video_notification(video_pk: int) -> None:
    """
    Send a video notification to all active subscribers.

    Accepts pk (not instance) so django-q2 can serialize safely.
    """
    from apps.content.models import Subscriber, VideoResource
    from apps.notifications.services.email_service import send_email

    video = VideoResource.objects.select_related("author").get(pk=video_pk)

    subscribers = list(Subscriber.objects.filter(status="ACTIVE"))
    count = len(subscribers)

    if count == 0:
        logger.info("No active subscribers — skipping notification for video %s", video.pk)
        return

    def _build_html(subscriber: Subscriber) -> str:
        unsubscribe_url = get_unsubscribe_url(subscriber.email)
        video_url = f"{_DOMAIN}/videos/{video.slug}"
        greeting = f"{subscriber.name}" if subscriber.name else ""

        # Video number badge
        number_label = ""
        if video.video_number:
            number_label = (
                f'<span style="display:inline-block;background-color:#C026D3;color:#FFFFFF;'
                f"font-family:{_FONT_STACK};font-size:11px;font-weight:700;padding:4px 14px;"
                f'border-radius:20px;letter-spacing:1px;text-transform:uppercase;">'
                f"Video #{video.video_number}</span>"
            )

        # Category badge
        category_label = _VIDEO_CATEGORIES.get(video.category, video.category)
        category_html = (
            f'<span style="display:inline-block;background-color:#E8F5F3;'
            f"color:#1E7A6E;font-family:{_FONT_STACK};font-size:11px;font-weight:600;"
            f'padding:3px 10px;border-radius:14px;">'
            f"{category_label}</span>"
        )

        # YouTube thumbnail
        import re

        yt_match = re.search(
            r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
            video.youtube_url,
        )
        thumbnail_url = video.thumbnail or ""
        if not thumbnail_url and yt_match:
            thumbnail_url = f"https://img.youtube.com/vi/{yt_match.group(1)}/hqdefault.jpg"

        thumbnail_html = ""
        if thumbnail_url:
            thumbnail_html = (
                f'<tr><td style="padding:0;" bgcolor="#FFFFFF">'
                f'<div style="position:relative;text-align:center;">'
                f'<a href="{video_url}" style="text-decoration:none;">'
                f'<img src="{thumbnail_url}" alt="{video.title}" '
                f'width="520" style="display:block;width:100%;max-width:520px;height:auto;'
                f'border-radius:10px;margin:0 auto;" />'
                f"</a>"
                f"</div>"
                f"</td></tr>"
                f'<tr><td style="padding:16px 0 0;" bgcolor="#FFFFFF"></td></tr>'
            )

        # Duration
        duration_html = ""
        if video.duration_seconds > 0:
            m, s = divmod(video.duration_seconds, 60)
            duration_html = (
                f'<span style="font-family:{_FONT_STACK};font-size:12px;color:#9CA3AF;">'
                f"&#9654; {m}:{s:02d} min</span>"
            )

        # Description
        description_html = ""
        if video.description:
            desc = video.description[:200]
            if len(video.description) > 200:
                desc += "..."
            description_html = (
                f'<p style="margin:0 0 28px;font-family:{_FONT_STACK};font-size:15px;'
                f'color:#555555;line-height:1.7;">{desc}</p>'
            )

        # Greeting
        greeting_html = ""
        if greeting:
            greeting_html = (
                f'<p style="font-family:{_FONT_STACK};color:#2C2C2C;font-size:15px;'
                f'line-height:1.6;margin:0 0 6px;">Hola <strong>{greeting}</strong>,</p>'
            )

        body_html = f"""
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <!-- Greeting + intro -->
                <tr>
                    <td style="padding:0 0 20px;" bgcolor="#FFFFFF">
                        {greeting_html}
                        <p style="font-family:{_FONT_STACK};color:#6B7280;font-size:14px;line-height:1.6;margin:0;">
                            Hay un nuevo video en la videoteca que puede interesarte:
                        </p>
                    </td>
                </tr>

                <!-- Divider -->
                <tr>
                    <td style="padding:0 0 24px;" bgcolor="#FFFFFF">
                        <div style="height:1px;background:linear-gradient(to right,#F3E8F5,#C026D3,#F3E8F5);"></div>
                    </td>
                </tr>

                <!-- Thumbnail -->
                {thumbnail_html}

                <!-- Number badge + category -->
                <tr>
                    <td style="padding:0 0 14px;" bgcolor="#FFFFFF">
                        {number_label}
                        {f'&nbsp;&nbsp;' if number_label else ''}
                        {category_html}
                    </td>
                </tr>

                <!-- Title -->
                <tr>
                    <td style="padding:0 0 8px;" bgcolor="#FFFFFF">
                        <a href="{video_url}" style="text-decoration:none;">
                            <h2 style="margin:0;font-family:{_DISPLAY_FONT};font-size:24px;
                                       color:#2C2C2C;line-height:1.3;font-weight:700;">
                                {video.title}
                            </h2>
                        </a>
                    </td>
                </tr>

                <!-- Duration -->
                <tr>
                    <td style="padding:0 0 20px;" bgcolor="#FFFFFF">
                        {duration_html}
                    </td>
                </tr>

                <!-- Description -->
                <tr>
                    <td style="padding:0;" bgcolor="#FFFFFF">
                        {description_html}
                    </td>
                </tr>

                <!-- CTA -->
                <tr>
                    <td style="padding:0 0 28px;" bgcolor="#FFFFFF">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="border-radius:8px; background-color:#C026D3;">
                                    <a href="{video_url}"
                                       style="display:inline-block; padding:14px 32px; color:#FFFFFF;
                                              font-family:{_FONT_STACK}; font-size:15px; font-weight:600;
                                              text-decoration:none; border-radius:8px;">
                                        &#9654;&nbsp; Ver video
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Divider -->
                <tr>
                    <td style="padding:0 0 20px;" bgcolor="#FFFFFF">
                        <div style="height:1px;background:linear-gradient(to right,#F3E8F5,#C026D3,#F3E8F5);"></div>
                    </td>
                </tr>

                <!-- Videoteca link -->
                <tr>
                    <td style="text-align:center;padding:0 0 12px;" bgcolor="#FFFFFF">
                        <p style="font-family:{_FONT_STACK};font-size:13px;color:#6B7280;margin:0 0 4px;">
                            &iquest;Quer&eacute;s ver m&aacute;s?
                        </p>
                        <a href="{_DOMAIN}/videos"
                           style="font-family:{_FONT_STACK};font-size:13px;color:#C026D3;
                                  font-weight:600;text-decoration:none;">
                            Visit&aacute; la videoteca &rarr;
                        </a>
                    </td>
                </tr>

                <!-- Auto-email notice -->
                <tr>
                    <td style="text-align:center; padding:8px 0 12px;" bgcolor="#FFFFFF">
                        <p style="font-family:{_FONT_STACK}; font-size:11px; color:#A0A0A0; margin:0;">
                            Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.
                        </p>
                    </td>
                </tr>
            </table>
"""

        return _email_shell(f"Nuevo video — {video.title}", body_html, unsubscribe_url)

    subject = f"Nuevo video: {video.title}"

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
                logger.exception("Failed to send video notification to %s", subscriber.email)

    logger.info("Video notification sent for video %s to %d subscribers", video.pk, count)
