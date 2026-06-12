"""
Seed 6 video resources with real YouTube URLs for testing the videoteca
page design and full playback flow.
"""

from django.db import migrations
from django.utils import timezone
from datetime import timedelta


VIDEOS = [
    {
        "title": "Fiebre en niños: cuándo preocuparse",
        "slug": "fiebre-en-ninos-cuando-preocuparse",
        "youtube_url": "https://www.youtube.com/watch?v=gVEEBquMNGo",
        "description": "La fiebre es el motivo de consulta más frecuente en pediatría. En este video te explico cuándo es una respuesta normal del cuerpo y cuándo sí debés consultar de urgencia. Aprenderás a medir correctamente la temperatura, cuándo usar antitérmicos y las señales de alarma reales.",
        "category": "URGENCIAS",
        "duration_seconds": 185,
        "chapters": [
            {"time_seconds": 0, "label": "Introducción"},
            {"time_seconds": 30, "label": "Qué es fiebre y qué no"},
            {"time_seconds": 75, "label": "Cómo medir correctamente"},
            {"time_seconds": 120, "label": "Cuándo dar antitérmicos"},
            {"time_seconds": 155, "label": "Señales de alarma"},
        ],
        "video_number": 1,
        "days_ago": 30,
    },
    {
        "title": "Lactancia materna: los primeros días",
        "slug": "lactancia-materna-primeros-dias",
        "youtube_url": "https://www.youtube.com/watch?v=hBMb0SR3hK4",
        "description": "Los primeros días de lactancia pueden ser desafiantes. Te cuento qué esperar, cómo lograr un buen agarre, cada cuánto dar pecho y cuándo pedir ayuda. Toda mamá debería ver este video antes del alta.",
        "category": "LACTANCIA",
        "duration_seconds": 210,
        "chapters": [
            {"time_seconds": 0, "label": "Qué esperar los primeros días"},
            {"time_seconds": 45, "label": "El agarre correcto"},
            {"time_seconds": 100, "label": "Frecuencia y duración"},
            {"time_seconds": 160, "label": "Señales de buena alimentación"},
            {"time_seconds": 190, "label": "Cuándo pedir ayuda"},
        ],
        "video_number": 2,
        "days_ago": 25,
    },
    {
        "title": "Alimentación complementaria: cómo empezar a los 6 meses",
        "slug": "alimentacion-complementaria-6-meses",
        "youtube_url": "https://www.youtube.com/watch?v=L-1CHuEzgoM",
        "description": "A los 6 meses tu bebé está listo para empezar a comer. Te explico con qué alimentos arrancar, cómo preparar las primeras papillas, texturas, BLW vs. tradicional y los alimentos que debés evitar el primer año.",
        "category": "ALIMENTACION",
        "duration_seconds": 240,
        "chapters": [
            {"time_seconds": 0, "label": "Señales de que está listo"},
            {"time_seconds": 40, "label": "Primeros alimentos"},
            {"time_seconds": 90, "label": "BLW vs. papillas"},
            {"time_seconds": 150, "label": "Texturas por edad"},
            {"time_seconds": 200, "label": "Alimentos a evitar"},
        ],
        "video_number": 3,
        "days_ago": 18,
    },
    {
        "title": "Sueño seguro del bebé: prevención de muerte súbita",
        "slug": "sueno-seguro-bebe-muerte-subita",
        "youtube_url": "https://www.youtube.com/watch?v=dLW4U4VArQs",
        "description": "La posición para dormir, el colchón, la temperatura de la habitación y el colecho seguro. Todo lo que necesitás saber para que tu bebé duerma de forma segura y vos estés tranquila.",
        "category": "SUENO",
        "duration_seconds": 195,
        "chapters": [
            {"time_seconds": 0, "label": "La posición correcta"},
            {"time_seconds": 35, "label": "El ambiente ideal"},
            {"time_seconds": 80, "label": "Colecho seguro"},
            {"time_seconds": 130, "label": "Mitos sobre el sueño"},
            {"time_seconds": 170, "label": "Resumen de recomendaciones"},
        ],
        "video_number": 4,
        "days_ago": 12,
    },
    {
        "title": "Botiquín pediátrico: lo esencial en casa",
        "slug": "botiquin-pediatrico-esencial-casa",
        "youtube_url": "https://www.youtube.com/watch?v=5MKjWBab9FU",
        "description": "Qué debe tener tu botiquín de primeros auxilios en casa cuando tenés hijos. Termómetro, suero fisiológico, antitérmicos, curitas, qué medicamentos NO tener y cuándo renovar cada cosa.",
        "category": "PRIMEROS_AUXILIOS",
        "duration_seconds": 165,
        "chapters": [
            {"time_seconds": 0, "label": "Lo imprescindible"},
            {"time_seconds": 40, "label": "Medicamentos básicos"},
            {"time_seconds": 80, "label": "Material de curación"},
            {"time_seconds": 120, "label": "Lo que NO debe estar"},
            {"time_seconds": 145, "label": "Organización y vencimientos"},
        ],
        "video_number": None,
        "is_published": False,
        "days_ago": 7,
    },
    {
        "title": "Hitos del desarrollo: 0 a 12 meses",
        "slug": "hitos-desarrollo-0-12-meses",
        "youtube_url": "https://www.youtube.com/watch?v=WRiSbgB4ssI",
        "description": "Los hitos del desarrollo motor y cognitivo mes a mes durante el primer año. Cuándo sostener la cabeza, sentarse, gatear, primeras palabras y cuándo consultar si algo no avanza como esperás.",
        "category": "DESARROLLO",
        "duration_seconds": 220,
        "chapters": [
            {"time_seconds": 0, "label": "0-3 meses"},
            {"time_seconds": 50, "label": "4-6 meses"},
            {"time_seconds": 100, "label": "7-9 meses"},
            {"time_seconds": 150, "label": "10-12 meses"},
            {"time_seconds": 190, "label": "Señales de alerta"},
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
