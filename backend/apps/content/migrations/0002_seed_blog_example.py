"""
Seed an example blog post so the public blog page has content to display.
"""

from django.db import migrations
from django.utils import timezone


BLOG_CONTENT = """
<p>La lactancia materna es uno de los temas que más dudas genera en las primeras semanas. Y está bien que así sea: <strong>nadie nace sabiendo amamantar</strong>. En esta guía quiero acompañarte con información clara, sin culpas y basada en evidencia, para que vivas esta etapa con más tranquilidad.</p>

<h2 id="s1">Por qué los primeros 6 meses</h2>
<p>La Organización Mundial de la Salud recomienda <strong>lactancia materna exclusiva durante los primeros 6 meses</strong> de vida. Esto significa que, idealmente, el bebé recibe solo leche materna —sin agua, infusiones ni otros alimentos— hasta esa edad.</p>
<p>La leche materna se adapta a las necesidades de tu bebé y le aporta defensas que ninguna fórmula puede replicar por completo. Pero cada familia es distinta, y lo más importante es que el bebé esté bien alimentado y crezca sano.</p>

<h2 id="s2">Las primeras tomas</h2>
<p>En los primeros días, el calostro —esa primera leche más espesa y amarillenta— es suficiente para tu bebé. Su estómago es del tamaño de una avellana, así que necesita poco volumen pero tomas frecuentes.</p>
<ul>
<li><strong>A libre demanda:</strong> ofrecé el pecho cada vez que el bebé muestre señales de hambre, sin esperar a que llore.</li>
<li><strong>8 a 12 tomas al día</strong> es normal en las primeras semanas.</li>
<li>Buscá que el bebé tome <strong>la mayor parte de la areola</strong>, no solo el pezón.</li>
</ul>

<h2 id="s3">Posiciones que funcionan</h2>
<p>No hay una única posición correcta. La clave es que <strong>el bebé esté bien enfrentado al pecho</strong>, con la cabeza y el cuerpo alineados. Las más usadas son la posición de cuna, la cuna cruzada y la posición de rugby (muy útil tras una cesárea).</p>

<h2 id="s4">Señales de que va bien</h2>
<p>Muchas mamás se preguntan si el bebé está tomando lo suficiente. Estas son las señales tranquilizadoras:</p>
<ul>
<li>Moja <strong>6 o más pañales</strong> al día después de la primera semana.</li>
<li>Sube de peso de forma sostenida en los controles.</li>
<li>Se ve <strong>activo, con buen color</strong> y satisfecho después de mamar.</li>
</ul>

<h2 id="s5">Dudas frecuentes</h2>
<h3>¿Y si no tengo suficiente leche?</h3>
<p>La gran mayoría de las mujeres produce la leche que su bebé necesita. La producción funciona por <strong>demanda</strong>: mientras más toma el bebé, más leche se produce. Las dudas sobre la cantidad casi siempre se resuelven con acompañamiento.</p>
<h3>¿Puedo combinar pecho y fórmula?</h3>
<p>Sí. La <strong>lactancia mixta</strong> es una opción válida cuando es necesaria. Lo importante es que tu bebé esté bien nutrido y que vos te sientas acompañada en la decisión.</p>

<p>Recordá: la lactancia es un aprendizaje para ambos. Date tiempo, pedí ayuda cuando la necesites y confiá en que lo estás haciendo bien. <strong>Estoy para acompañarte en cada paso.</strong></p>
"""


def seed_blog(apps, schema_editor):
    BlogPost = apps.get_model("content", "BlogPost")
    Practice = apps.get_model("practice", "Practice")
    User = apps.get_model("users", "User")

    practice = Practice.objects.first()
    author = User.objects.filter(role="DOCTOR").first()
    if not practice or not author:
        return

    if BlogPost.objects.filter(slug="lactancia-materna-primeros-6-meses").exists():
        return

    now = timezone.now()
    BlogPost.objects.create(
        practice=practice,
        author=author,
        title="Lactancia materna en los primeros 6 meses: todo lo que necesitás saber",
        slug="lactancia-materna-primeros-6-meses",
        excerpt="Una guía honesta y sin presiones para acompañar a las mamás que recién empiezan: posiciones, frecuencia y cómo resolver las dificultades más comunes.",
        content=BLOG_CONTENT.strip(),
        is_published=True,
        published_at=now,
        tags="Lactancia",
        meta_description="Guía completa de lactancia materna para los primeros 6 meses: posiciones, frecuencia, señales y dudas frecuentes.",
    )


def unseed_blog(apps, schema_editor):
    BlogPost = apps.get_model("content", "BlogPost")
    BlogPost.objects.filter(slug="lactancia-materna-primeros-6-meses").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0001_initial"),
        ("practice", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_blog, unseed_blog),
    ]
