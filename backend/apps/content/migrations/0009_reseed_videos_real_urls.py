"""
Replace seed videos with real YouTube URLs that can actually be played.
Removes videos from 0008 (fake IDs) and inserts working ones.
"""

from django.db import migrations


OLD_SLUGS = [
    "fiebre-en-ninos-cuando-preocuparse",
    "lactancia-materna-primeros-dias",
    "alimentacion-complementaria-6-meses",
    "sueno-seguro-bebe-muerte-subita",
    "botiquin-pediatrico-esencial-casa",
    "hitos-desarrollo-0-12-meses",
]

NEW_SLUGS = [
    "fiebre-en-ninos-como-bajarla",
    "lactancia-materna-guia-completa",
    "alimentacion-complementaria-como-empezar",
    "sueno-seguro-del-bebe",
    "baby-led-weaning-alimentacion-guiada",
    "hitos-desarrollo-4-meses",
]


def reseed(apps, schema_editor):
    VideoResource = apps.get_model("content", "VideoResource")
    # Remove old fake-URL videos
    VideoResource.objects.filter(slug__in=OLD_SLUGS).delete()
    # 0008 updated with real URLs will handle the insert on fresh DBs.
    # For existing DBs, we re-run the seed logic here.
    from django.utils import timezone
    from datetime import timedelta

    Practice = apps.get_model("practice", "Practice")
    User = apps.get_model("users", "User")

    practice = Practice.objects.first()
    author = User.objects.filter(role="DOCTOR").first() or User.objects.first()
    if not practice or not author:
        return

    now = timezone.now()

    videos = [
        {
            "title": "Fiebre en niños: cómo lograr bajarla",
            "slug": "fiebre-en-ninos-como-bajarla",
            "youtube_url": "https://www.youtube.com/watch?v=TuAeUr0D1RQ",
            "description": "La fiebre es el motivo de consulta más frecuente en pediatría. En este video te explico cuándo es una respuesta normal del cuerpo y cuándo sí debés consultar de urgencia.",
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
            "is_published": True,
            "days_ago": 30,
        },
        {
            "title": "Lactancia materna: guía completa",
            "slug": "lactancia-materna-guia-completa",
            "youtube_url": "https://www.youtube.com/watch?v=jYqE-n9wsa0",
            "description": "Los primeros días de lactancia pueden ser desafiantes. Qué esperar, cómo lograr un buen agarre, cada cuánto dar pecho y cuándo pedir ayuda.",
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
            "is_published": True,
            "days_ago": 25,
        },
        {
            "title": "Alimentación complementaria: cómo empezar",
            "slug": "alimentacion-complementaria-como-empezar",
            "youtube_url": "https://www.youtube.com/watch?v=Seo0ngQClU4",
            "description": "A los 6 meses tu bebé está listo para empezar a comer. Con qué alimentos arrancar, texturas, BLW vs. tradicional y los alimentos que debés evitar.",
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
            "is_published": True,
            "days_ago": 18,
        },
        {
            "title": "Sueño seguro del bebé",
            "slug": "sueno-seguro-del-bebe",
            "youtube_url": "https://www.youtube.com/watch?v=fvKhyDJ470A",
            "description": "La posición para dormir, el colchón, la temperatura de la habitación y el colecho seguro. Todo lo que necesitás saber para que tu bebé duerma de forma segura.",
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
            "is_published": True,
            "days_ago": 12,
        },
        {
            "title": "Baby Led Weaning: alimentación guiada por el bebé",
            "slug": "baby-led-weaning-alimentacion-guiada",
            "youtube_url": "https://www.youtube.com/watch?v=HfBjHKeZvQ4",
            "description": "Qué es el BLW, cómo empezar de forma segura, qué alimentos ofrecer primero y cómo prevenir el atragantamiento.",
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
            "description": "Los hitos del desarrollo motor y cognitivo a los 4 meses. Qué es normal, cuándo consultar y cómo estimular a tu bebé.",
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

    for v in videos:
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


def unreeseed(apps, schema_editor):
    VideoResource = apps.get_model("content", "VideoResource")
    VideoResource.objects.filter(slug__in=NEW_SLUGS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0008_seed_videos"),
    ]

    operations = [
        migrations.RunPython(reseed, unreeseed),
    ]
