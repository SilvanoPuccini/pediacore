"""
Seed 6 video resources with real YouTube URLs for testing the videoteca
page design and full playback flow.
"""

from django.db import migrations
from django.utils import timezone
from datetime import timedelta


VIDEOS = [
    {
        "title": "Fiebre en niños: cómo lograr bajarla",
        "slug": "fiebre-en-ninos-como-bajarla",
        "youtube_url": "https://www.youtube.com/watch?v=TuAeUr0D1RQ",
        "description": "La fiebre es el motivo de consulta más frecuente en pediatría. En este video te explico cuándo es una respuesta normal del cuerpo y cuándo sí debés consultar de urgencia. Aprenderás a medir correctamente la temperatura, cuándo usar antitérmicos y las señales de alarma reales.",
        "category": "URGENCIAS",
        "duration_seconds": 480,
        "chapters": [
            {"time_seconds": 0, "label": "Introducción"},
            {"time_seconds": 60, "label": "Qué es fiebre y qué no"},
            {"time_seconds": 180, "label": "Cómo medir correctamente"},
            {"time_seconds": 300, "label": "Cuándo dar antitérmicos"},
            {"time_seconds": 420, "label": "Señales de alarma"},
        ],
        "video_number": 1,
        "days_ago": 30,
    },
    {
        "title": "Lactancia materna: guía completa",
        "slug": "lactancia-materna-guia-completa",
        "youtube_url": "https://www.youtube.com/watch?v=jYqE-n9wsa0",
        "description": "Los primeros días de lactancia pueden ser desafiantes. Qué esperar, cómo lograr un buen agarre, cada cuánto dar pecho y cuándo pedir ayuda. Toda mamá debería ver este video antes del alta.",
        "category": "LACTANCIA",
        "duration_seconds": 360,
        "chapters": [
            {"time_seconds": 0, "label": "Qué esperar los primeros días"},
            {"time_seconds": 70, "label": "El agarre correcto"},
            {"time_seconds": 150, "label": "Frecuencia y duración"},
            {"time_seconds": 250, "label": "Señales de buena alimentación"},
            {"time_seconds": 320, "label": "Cuándo pedir ayuda"},
        ],
        "video_number": 2,
        "days_ago": 25,
    },
    {
        "title": "Alimentación complementaria: cómo empezar",
        "slug": "alimentacion-complementaria-como-empezar",
        "youtube_url": "https://www.youtube.com/watch?v=Seo0ngQClU4",
        "description": "A los 6 meses tu bebé está listo para empezar a comer. Con qué alimentos arrancar, cómo preparar las primeras papillas, texturas, BLW vs. tradicional y los alimentos que debés evitar el primer año.",
        "category": "ALIMENTACION",
        "duration_seconds": 600,
        "chapters": [
            {"time_seconds": 0, "label": "Señales de que está listo"},
            {"time_seconds": 90, "label": "Primeros alimentos"},
            {"time_seconds": 210, "label": "BLW vs. papillas"},
            {"time_seconds": 380, "label": "Texturas por edad"},
            {"time_seconds": 510, "label": "Alimentos a evitar"},
        ],
        "video_number": 3,
        "days_ago": 18,
    },
    {
        "title": "Sueño seguro del bebé",
        "slug": "sueno-seguro-del-bebe",
        "youtube_url": "https://www.youtube.com/watch?v=fvKhyDJ470A",
        "description": "La posición para dormir, el colchón, la temperatura de la habitación y el colecho seguro. Todo lo que necesitás saber para que tu bebé duerma de forma segura y vos estés tranquila.",
        "category": "SUENO",
        "duration_seconds": 180,
        "chapters": [
            {"time_seconds": 0, "label": "La posición correcta"},
            {"time_seconds": 35, "label": "El ambiente ideal"},
            {"time_seconds": 80, "label": "Colecho seguro"},
            {"time_seconds": 130, "label": "Mitos sobre el sueño"},
            {"time_seconds": 160, "label": "Resumen"},
        ],
        "video_number": 4,
        "days_ago": 12,
    },
    {
        "title": "Baby Led Weaning: alimentación guiada por el bebé",
        "slug": "baby-led-weaning-alimentacion-guiada",
        "youtube_url": "https://www.youtube.com/watch?v=HfBjHKeZvQ4",
        "description": "Qué es el BLW, cómo empezar de forma segura, qué alimentos ofrecer primero y cómo prevenir el atragantamiento. Una guía práctica para padres que quieren probar este método.",
        "category": "ALIMENTACION",
        "duration_seconds": 420,
        "chapters": [
            {"time_seconds": 0, "label": "Qué es el BLW"},
            {"time_seconds": 80, "label": "Cuándo empezar"},
            {"time_seconds": 170, "label": "Alimentos seguros"},
            {"time_seconds": 280, "label": "Atragantamiento vs. arcada"},
            {"time_seconds": 370, "label": "Consejos prácticos"},
        ],
        "video_number": None,
        "is_published": False,
        "days_ago": 7,
    },
    {
        "title": "Hitos del desarrollo: qué esperar a los 4 meses",
        "slug": "hitos-desarrollo-4-meses",
        "youtube_url": "https://www.youtube.com/watch?v=EvyFOrigSZk",
        "description": "Los hitos del desarrollo motor y cognitivo a los 4 meses. Qué es normal, cuándo consultar y cómo estimular a tu bebé de forma natural en esta etapa clave.",
        "category": "DESARROLLO",
        "duration_seconds": 540,
        "chapters": [
            {"time_seconds": 0, "label": "Desarrollo motor"},
            {"time_seconds": 100, "label": "Desarrollo cognitivo"},
            {"time_seconds": 220, "label": "Alimentación a esta edad"},
            {"time_seconds": 350, "label": "Sueño"},
            {"time_seconds": 460, "label": "Señales de alerta"},
        ],
        "video_number": None,
        "is_published": False,
        "days_ago": 3,
    },
]


def seed_videos(apps, schema_editor):
    VideoResource = apps.get_model("content", "VideoResource")
    Practice = apps.get_model("practice", "Practice")
    User = apps.get_model("users", "User")

    practice = Practice.objects.first()
    author = User.objects.filter(role="DOCTOR").first() or User.objects.first()

    if not practice or not author:
        return

    now = timezone.now()

    for v in VIDEOS:
        if VideoResource.objects.filter(slug=v["slug"]).exists():
            continue

        published = v.get("is_published", True)

        VideoResource.objects.create(
            practice=practice,
            author=author,
            title=v["title"],
            slug=v["slug"],
            youtube_url=v["youtube_url"],
            description=v["description"],
            category=v["category"],
            duration_seconds=v["duration_seconds"],
            chapters=v["chapters"],
            video_number=v["video_number"],
            is_published=published,
            published_at=(now - timedelta(days=v["days_ago"])) if published else None,
        )


def unseed_videos(apps, schema_editor):
    VideoResource = apps.get_model("content", "VideoResource")
    slugs = [v["slug"] for v in VIDEOS]
    VideoResource.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0007_seed_blog_posts"),
    ]

    operations = [
        migrations.RunPython(seed_videos, unseed_videos),
    ]
