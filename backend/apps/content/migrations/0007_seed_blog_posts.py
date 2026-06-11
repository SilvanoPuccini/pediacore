"""
Seed 6 additional blog posts with real pediatric content for testing
pagination, navigation, and the full blog reading experience.
"""

from django.db import migrations
from django.utils import timezone
from datetime import timedelta


POSTS = [
    {
        "title": "Fiebre en niños: cuándo preocuparse y cuándo no",
        "slug": "fiebre-en-ninos-cuando-preocuparse",
        "excerpt": "Cómo medirla correctamente, cuándo dar antitérmicos y las señales de alarma que sí ameritan una consulta de urgencia.",
        "tags": "Urgencias",
        "meta_description": "Guía práctica sobre fiebre infantil: medición, antitérmicos y señales de alarma para padres.",
        "post_number": 2,
        "days_ago": 25,
        "content": """
<p>La fiebre es, probablemente, el motivo de consulta más frecuente en pediatría. Y lo entiendo: ver a tu hijo caliente, decaído y quejoso genera angustia. Pero necesito que sepas algo importante: <strong>la fiebre no es una enfermedad, es una respuesta del cuerpo</strong>.</p>

<h2 id="s1">Qué es fiebre y qué no</h2>
<p>Se considera <strong>fiebre</strong> cuando la temperatura axilar supera los <strong>37.5 °C</strong>. Entre 37.0 y 37.5 se habla de febrícula, y por debajo de 37.0 es temperatura normal.</p>
<p>El cuerpo sube la temperatura como mecanismo de defensa: activa el sistema inmunológico y dificulta la multiplicación de virus y bacterias. Por eso, <strong>no siempre hay que bajarla a toda costa</strong>.</p>

<h2 id="s2">Cómo medir correctamente</h2>
<p>El termómetro digital en la axila es el método más práctico y seguro para niños. Algunos consejos:</p>
<ul>
<li>Colocá el termómetro en la axila <strong>seca</strong>, bien pegado al cuerpo.</li>
<li>Esperá hasta que suene la señal (generalmente 60–90 segundos).</li>
<li>Los termómetros de oído pueden ser prácticos pero son menos confiables en menores de 6 meses.</li>
<li><strong>Evitá los termómetros de mercurio</strong> — están descontinuados por seguridad.</li>
</ul>

<h2 id="s3">Cuándo dar antitérmicos</h2>
<p>No es necesario medicar cada vez que el termómetro marca fiebre. La indicación principal es el <strong>malestar del niño</strong>, no el número en sí.</p>
<ul>
<li><strong>Paracetamol (acetaminofén):</strong> desde los primeros meses. Dosis según peso, cada 6–8 horas.</li>
<li><strong>Ibuprofeno:</strong> a partir de los 6 meses. Dosis según peso, cada 6–8 horas.</li>
<li><strong>Nunca aspirina</strong> en niños — se asocia al síndrome de Reye.</li>
<li>No alternar medicamentos salvo que lo indique tu pediatra.</li>
</ul>

<h2 id="s4">Señales de alarma</h2>
<p>La mayoría de las fiebres son virales y se resuelven solas en 2–3 días. Pero consultá de urgencia si:</p>
<ul>
<li>Tu bebé tiene <strong>menos de 3 meses</strong> y presenta fiebre (cualquier valor).</li>
<li>La fiebre dura <strong>más de 72 horas</strong> sin mejoría.</li>
<li>Aparecen <strong>manchas en la piel</strong> que no desaparecen al presionar.</li>
<li>El niño está <strong>muy decaído</strong>, no responde o le cuesta respirar.</li>
<li>Presenta <strong>rigidez en el cuello</strong> o vómitos persistentes.</li>
</ul>

<h2 id="s5">Lo que no funciona</h2>
<p>Algunos mitos que conviene dejar atrás:</p>
<ul>
<li>Los paños fríos o baños helados <strong>no bajan la fiebre</strong> y generan malestar. Si querés refrescar, usá agua tibia.</li>
<li>Abrigar de más tampoco ayuda — vestí al niño con ropa liviana.</li>
<li>Las convulsiones febriles, aunque asustan, son benignas en la mayoría de los casos y no causan daño neurológico.</li>
</ul>

<p>Lo más importante: <strong>observá a tu hijo, no al termómetro</strong>. Un niño con 39 °C que juega y toma líquido probablemente esté bien. Un niño con 38 °C que no reacciona merece una consulta. Siempre confiá en tu instinto y no dudes en llamarme.</p>
""",
    },
    {
        "title": "Alimentación complementaria: cómo empezar a los 6 meses",
        "slug": "alimentacion-complementaria-6-meses",
        "excerpt": "Cuándo y cómo introducir los primeros alimentos sin estrés, paso a paso, respetando el ritmo de tu bebé.",
        "tags": "Alimentación",
        "meta_description": "Guía para iniciar la alimentación complementaria a los 6 meses: alimentos, texturas, BLW y señales de preparación.",
        "post_number": 3,
        "days_ago": 20,
        "content": """
<p>A los 6 meses, la leche materna (o fórmula) sigue siendo el alimento principal. Pero es el momento de empezar a ofrecer otros alimentos. <strong>No hay que apurarse ni estresarse</strong>: es un proceso gradual de descubrimiento.</p>

<h2 id="s1">Señales de que tu bebé está listo</h2>
<p>Antes de empezar, asegurate de que tu bebé cumple estas condiciones:</p>
<ul>
<li>Se <strong>sienta con apoyo</strong> y sostiene bien la cabeza.</li>
<li>Muestra <strong>interés por la comida</strong>: mira, estira la mano, se lleva cosas a la boca.</li>
<li>Perdió el <strong>reflejo de extrusión</strong> (ya no empuja todo con la lengua hacia afuera).</li>
<li>Tiene al menos <strong>6 meses cumplidos</strong> (no antes, salvo indicación médica).</li>
</ul>

<h2 id="s2">Por dónde empezar</h2>
<p>No hay un orden estricto. Lo que sí importa:</p>
<ul>
<li><strong>Un alimento nuevo por vez</strong>, esperando 2–3 días antes de incorporar otro.</li>
<li>Empezá con texturas blandas: puré suave, papilla o trozos grandes y blandos si elegís BLW.</li>
<li>Buenos primeros alimentos: <strong>zapallo, batata, banana, palta, zanahoria cocida, manzana cocida</strong>.</li>
<li>A partir del 7mo mes podés sumar <strong>carnes</strong> (pollo, vacuno) bien desmenuzadas — aportan hierro.</li>
</ul>

<h2 id="s3">BLW: alimentación guiada por el bebé</h2>
<p>El Baby-Led Weaning propone ofrecer alimentos en trozos que el bebé pueda agarrar y llevar a la boca solo. Es una opción válida y segura si:</p>
<ul>
<li>El bebé cumple las señales de preparación.</li>
<li>Los alimentos son del <strong>tamaño de un dedo adulto</strong>, blandos y sin riesgo de atragantamiento.</li>
<li>Siempre supervisado, sentado y erguido.</li>
<li>Podés combinar BLW con papillas — no tiene que ser uno u otro.</li>
</ul>

<h2 id="s4">Alimentos a evitar antes del año</h2>
<ul>
<li><strong>Miel:</strong> riesgo de botulismo.</li>
<li><strong>Sal y azúcar agregados:</strong> no los necesita.</li>
<li><strong>Leche de vaca entera</strong> como bebida principal (sí se puede usar en preparaciones).</li>
<li><strong>Frutos secos enteros, uvas enteras, salchichas en rodajas:</strong> riesgo de atragantamiento.</li>
<li>Jugos comerciales y alimentos ultraprocesados.</li>
</ul>

<h2 id="s5">El plato ideal a los 8–9 meses</h2>
<p>A esta edad, tu bebé debería estar comiendo 2–3 veces al día además de la leche:</p>
<ul>
<li>Una porción de <strong>verdura o fruta</strong>.</li>
<li>Una porción de <strong>cereal o tubérculo</strong> (arroz, fideos, papa).</li>
<li>Una porción de <strong>proteína</strong> (carne, pollo, legumbres, huevo).</li>
<li>Un poco de <strong>grasa saludable</strong> (aceite de oliva, palta).</li>
</ul>

<p>Recordá: el objetivo no es que coma mucho, sino que <strong>explore, pruebe y disfrute</strong>. La leche sigue siendo la base nutricional hasta el año. Paciencia, ropa vieja y muchas fotos.</p>
""",
    },
    {
        "title": "Sueño seguro del bebé: mitos y verdades",
        "slug": "sueno-seguro-bebe-mitos-verdades",
        "excerpt": "Qué dice la evidencia sobre cómo y dónde debe dormir tu bebé para prevenir riesgos, sin alarmismos.",
        "tags": "Sueño",
        "meta_description": "Recomendaciones basadas en evidencia sobre sueño seguro del bebé: posición, superficie, colecho y prevención.",
        "post_number": 4,
        "days_ago": 16,
        "content": """
<p>El sueño de los bebés es uno de los temas que más preocupa (y agota) a las familias. Más allá de las rutinas y los despertares nocturnos, hay un aspecto que no es negociable: <strong>la seguridad durante el sueño</strong>.</p>

<h2 id="s1">La posición: siempre boca arriba</h2>
<p>Desde 1992, la recomendación mundial es clara: los bebés deben dormir <strong>boca arriba (decúbito supino)</strong> hasta que puedan darse vuelta solos en ambas direcciones.</p>
<p>Esta simple medida redujo la muerte súbita del lactante en más del 50%. No hay excepciones: ni de costado, ni boca abajo, ni con almohadas para "mantener la posición".</p>

<h2 id="s2">La superficie: firme y sin nada</h2>
<p>El lugar ideal para dormir es un <strong>colchón firme, plano, con sábana ajustable</strong> y nada más. Eso significa:</p>
<ul>
<li><strong>Sin almohadas, peluches, mantas sueltas ni protectores de cuna.</strong></li>
<li>Sin nidos, reductores ni almohadones antivuelco.</li>
<li>La cuna o moisés debe cumplir normas de seguridad (barrotes separados menos de 6.5 cm).</li>
<li>La temperatura ideal de la habitación es entre <strong>20–22 °C</strong>.</li>
</ul>

<h2 id="s3">Colecho: lo que dice la evidencia</h2>
<p>El colecho (compartir cama) es una práctica extendida y culturalmente valiosa. Pero la evidencia muestra que aumenta el riesgo de muerte súbita, especialmente si:</p>
<ul>
<li>El bebé tiene <strong>menos de 4 meses</strong>.</li>
<li>Alguno de los padres fuma, consumió alcohol o medicación sedante.</li>
<li>El colchón es blando o hay mantas pesadas.</li>
</ul>
<p>Una alternativa segura es la <strong>cuna adosada (sidecar)</strong>: el bebé duerme en su propia superficie firme pero al lado tuyo, facilitando la lactancia nocturna.</p>

<h2 id="s4">Otros factores protectores</h2>
<ul>
<li><strong>Lactancia materna:</strong> reduce el riesgo de muerte súbita hasta en un 50%.</li>
<li><strong>Chupete para dormir</strong> (después de que la lactancia esté establecida): tiene efecto protector.</li>
<li><strong>No fumar</strong> durante el embarazo ni después — es el factor de riesgo modificable más importante.</li>
<li><strong>No abrigar de más:</strong> el sobrecalentamiento es un factor de riesgo.</li>
</ul>

<h2 id="s5">Cuándo dejar de preocuparse</h2>
<p>El período de mayor riesgo es entre los <strong>2 y 4 meses</strong>. Después del año, el riesgo baja significativamente. Cuando tu bebé pueda darse vuelta solo (generalmente entre los 4–6 meses), ya no necesitás forzar la posición boca arriba — pero seguí acostándolo así.</p>

<p>Sé que es imposible no mirar al bebé cada 5 minutos mientras duerme. Pero con estas medidas simples, podés descansar con más tranquilidad. Y si algo te genera duda, consultame.</p>
""",
    },
    {
        "title": "Señales de alarma en recién nacidos que no podés ignorar",
        "slug": "senales-alarma-recien-nacidos",
        "excerpt": "Los signos que sí ameritan una consulta inmediata en las primeras semanas de vida, sin alarmismos innecesarios.",
        "tags": "Urgencias",
        "meta_description": "Señales de alarma en recién nacidos: cuándo consultar de urgencia en las primeras semanas de vida del bebé.",
        "post_number": 5,
        "days_ago": 12,
        "content": """
<p>Las primeras semanas con un recién nacido son intensas. Todo es nuevo, todo parece frágil, y es normal sentir que cualquier cosa podría ser una emergencia. Quiero ayudarte a distinguir <strong>lo que es esperable de lo que realmente requiere atención urgente</strong>.</p>

<h2 id="s1">Señales que requieren consulta inmediata</h2>
<p>Estas son las situaciones en las que debés consultar sin esperar:</p>
<ul>
<li><strong>Fiebre en menores de 3 meses:</strong> cualquier temperatura axilar mayor a 37.5 °C. No automediques, consultá.</li>
<li><strong>Dificultad para respirar:</strong> respiración muy rápida, hundimiento de las costillas, quejido al exhalar, labios azulados.</li>
<li><strong>Rechazo del alimento:</strong> si el bebé no quiere tomar pecho ni mamadera en más de 2 tomas seguidas.</li>
<li><strong>Vómitos persistentes:</strong> no confundir con regurgitación normal. Vómitos en proyectil o verdosos requieren evaluación.</li>
<li><strong>Letargia:</strong> si el bebé está excesivamente dormido, no reacciona a estímulos o cuesta despertarlo para comer.</li>
<li><strong>Ictericia intensa:</strong> color amarillo que avanza hacia las piernas o se intensifica después del día 3.</li>
</ul>

<h2 id="s2">Lo que es normal (aunque asuste)</h2>
<p>Muchas cosas que parecen alarmantes son completamente normales en un recién nacido:</p>
<ul>
<li><strong>Estornudos frecuentes:</strong> no es resfrío, es su forma de limpiar las vías respiratorias.</li>
<li><strong>Hipo:</strong> es normal y no les molesta tanto como a nosotros.</li>
<li><strong>Deposiciones explosivas y ruidosas:</strong> especialmente en bebés amamantados.</li>
<li><strong>Temblor de mentón o manos:</strong> su sistema nervioso está madurando.</li>
<li><strong>Congestión nasal leve:</strong> las narices de los recién nacidos son muy pequeñas.</li>
<li><strong>Pérdida de peso los primeros días:</strong> es fisiológica hasta un 7–10% del peso de nacimiento.</li>
</ul>

<h2 id="s3">El cordón umbilical</h2>
<p>El muñón del cordón se cae entre los 7 y 21 días. Mientras tanto:</p>
<ul>
<li>Mantenelo <strong>limpio y seco</strong>.</li>
<li>No lo cubras con gasas ni le pongas alcohol.</li>
<li>Es normal que tenga un poco de olor y secreción amarillenta.</li>
<li>Consultá si ves <strong>enrojecimiento alrededor de la base, pus o mal olor intenso</strong>.</li>
</ul>

<h2 id="s4">Cuánto es normal que llore</h2>
<p>Un recién nacido puede llorar entre <strong>1 y 3 horas al día</strong>, con picos alrededor de las 6 semanas. El llanto es su forma de comunicación, no siempre significa que algo está mal.</p>
<p>Sin embargo, un llanto inconsolable que dura horas y se acompaña de otros síntomas (fiebre, rechazo alimentario, abdomen duro) merece evaluación.</p>

<h2 id="s5">Tu instinto también cuenta</h2>
<p>Más allá de las listas de síntomas, hay algo que la medicina valora mucho: <strong>el instinto de los padres</strong>. Si sentís que algo no está bien con tu bebé, aunque no puedas explicar exactamente qué, consultá. Prefiero verte en el consultorio por una duda legítima que enterarme tarde de algo importante.</p>
""",
    },
    {
        "title": "Desarrollo del lenguaje: hitos por edad y cuándo consultar",
        "slug": "desarrollo-lenguaje-hitos-por-edad",
        "excerpt": "Qué esperar mes a mes en el desarrollo del habla y cuándo conviene consultar a un especialista.",
        "tags": "Desarrollo",
        "meta_description": "Hitos del desarrollo del lenguaje en niños: qué es normal por edad y cuándo consultar al pediatra.",
        "post_number": 6,
        "days_ago": 8,
        "content": """
<p>El desarrollo del lenguaje es uno de los procesos más fascinantes de la infancia. Y también uno de los que más preguntas genera. <strong>Cada niño tiene su ritmo</strong>, pero hay hitos que nos orientan sobre si el camino va bien.</p>

<h2 id="s1">De 0 a 6 meses: los primeros sonidos</h2>
<ul>
<li><strong>0–2 meses:</strong> llanto diferenciado (hambre, sueño, malestar), sonidos guturales.</li>
<li><strong>3–4 meses:</strong> gorjeo, risas, vocalización cuando le hablás ("aaa", "uuu").</li>
<li><strong>5–6 meses:</strong> balbuceo con consonantes ("bababa", "mamama"). Responde a su nombre girando la cabeza.</li>
</ul>
<p>En esta etapa, lo más importante es que el bebé <strong>reaccione a los sonidos y busque comunicarse</strong> con la mirada y la voz.</p>

<h2 id="s2">De 6 a 12 meses: la intención comunicativa</h2>
<ul>
<li><strong>7–9 meses:</strong> balbuceo variado ("dada", "tata"), señala con el dedo, entiende el "no".</li>
<li><strong>10–12 meses:</strong> primeras palabras con significado ("mamá", "papá", "agua"). Entiende instrucciones simples como "dame" o "mirá".</li>
</ul>
<p>No te preocupes si las primeras palabras no son perfectas — "aba" por "agua" cuenta. Lo que importa es la <strong>intención de comunicar</strong>.</p>

<h2 id="s3">De 1 a 2 años: la explosión del vocabulario</h2>
<ul>
<li><strong>12–18 meses:</strong> entre 5 y 20 palabras. Señala lo que quiere, entiende más de lo que dice.</li>
<li><strong>18–24 meses:</strong> entre 50 y 200 palabras. Empieza a combinar dos palabras ("mamá agua", "más pan"). Puede nombrar partes del cuerpo y objetos cotidianos.</li>
</ul>
<p>Alrededor de los 18 meses suele ocurrir la <strong>"explosión del vocabulario"</strong>: de pronto, parece que aprende una palabra nueva cada día.</p>

<h2 id="s4">De 2 a 3 años: frases y conversaciones</h2>
<ul>
<li><strong>2 años:</strong> frases de 2–3 palabras, usa pronombres ("yo", "mío"), pregunta "¿qué es?".</li>
<li><strong>2.5–3 años:</strong> oraciones más largas, cuenta experiencias simples, personas ajenas a la familia entienden alrededor del 75% de lo que dice.</li>
</ul>

<h2 id="s5">Cuándo consultar</h2>
<p>Cada niño es diferente, pero estas son señales que ameritan evaluación:</p>
<ul>
<li><strong>12 meses:</strong> no balbucea, no señala, no responde a su nombre.</li>
<li><strong>18 meses:</strong> menos de 5 palabras, no señala lo que quiere.</li>
<li><strong>24 meses:</strong> menos de 50 palabras, no combina dos palabras.</li>
<li><strong>A cualquier edad:</strong> pérdida de habilidades que ya tenía (regresión).</li>
</ul>
<p>La detección temprana hace toda la diferencia. Si tenés dudas, no esperes — la consulta con fonoaudiología puede empezar desde muy temprano y los resultados son mucho mejores cuanto antes se interviene.</p>
""",
    },
    {
        "title": "Botiquín en casa: qué tener para los primeros años",
        "slug": "botiquin-casa-primeros-anos",
        "excerpt": "La lista esencial de elementos para resolver lo cotidiano con tranquilidad y saber cuándo es suficiente con lo que tenés en casa.",
        "tags": "Consejos",
        "meta_description": "Botiquín pediátrico esencial para el hogar: medicamentos, instrumentos y materiales que toda familia necesita.",
        "post_number": 7,
        "days_ago": 4,
        "content": """
<p>Tener un botiquín bien armado en casa no es para atender emergencias graves — para eso está la guardia. Es para <strong>resolver con calma las situaciones cotidianas</strong> sin tener que salir corriendo a la farmacia a las 3 de la mañana.</p>

<h2 id="s1">Medicamentos básicos</h2>
<p>Estos son los únicos medicamentos que recomiendo tener en casa para niños, siempre con dosis indicadas por tu pediatra:</p>
<ul>
<li><strong>Paracetamol (gotas o jarabe):</strong> para fiebre y dolor. La dosis es por peso, no por edad.</li>
<li><strong>Ibuprofeno (jarabe):</strong> a partir de los 6 meses. También por peso.</li>
<li><strong>Suero fisiológico en gotas:</strong> para lavado nasal. Es lo único que funciona para la congestión en bebés.</li>
<li><strong>Sales de rehidratación oral:</strong> para cuadros de vómitos o diarrea. Mejor tenerlas que necesitarlas.</li>
<li><strong>Crema de óxido de zinc:</strong> para la dermatitis del pañal.</li>
</ul>
<p><strong>Lo que NO debe estar:</strong> antibióticos sobrantes, gotas para los oídos "por las dudas", jarabes para la tos (no están recomendados en menores de 6 años).</p>

<h2 id="s2">Instrumentos</h2>
<ul>
<li><strong>Termómetro digital:</strong> el de axila es el más práctico y seguro.</li>
<li><strong>Aspirador nasal:</strong> tipo pera o de succión. Junto con el suero fisiológico, es la combinación ganadora para noches congestionadas.</li>
<li><strong>Jeringa dosificadora:</strong> para dar medicamentos con precisión (generalmente vienen con los jarabes).</li>
</ul>

<h2 id="s3">Material de curación</h2>
<ul>
<li><strong>Gasas estériles</strong> y <strong>cinta micropore.</strong></li>
<li><strong>Curitas de diferentes tamaños.</strong></li>
<li><strong>Solución antiséptica suave</strong> (clorhexidina, no alcohol ni agua oxigenada en heridas).</li>
<li><strong>Tijera de punta roma</strong> para cortar gasas sin riesgo.</li>
</ul>

<h2 id="s4">Para el sol y los mosquitos</h2>
<ul>
<li><strong>Protector solar factor 50+:</strong> a partir de los 6 meses. Antes de esa edad, la indicación es evitar la exposición directa.</li>
<li><strong>Repelente de mosquitos:</strong> los que contienen DEET al 10–30% son seguros a partir de los 2 meses en Chile.</li>
<li><strong>Loción de calamina o crema con corticoide suave:</strong> para picaduras que generen mucha reacción.</li>
</ul>

<h2 id="s5">Organización y revisión</h2>
<ul>
<li>Guardá todo en un lugar <strong>alto, seco y fuera del alcance de los niños</strong>.</li>
<li>Revisá las <strong>fechas de vencimiento</strong> cada 6 meses.</li>
<li>Anotá las <strong>dosis actualizadas</strong> de paracetamol e ibuprofeno según el peso actual de tu hijo (cambian rápido en el primer año).</li>
<li>Tené a mano el <strong>número de tu pediatra y de la guardia más cercana</strong>.</li>
</ul>

<p>Un botiquín simple, bien organizado y con los básicos correctos te da tranquilidad. Y si algo te supera, llamame — para eso estoy.</p>
""",
    },
]


def seed_posts(apps, schema_editor):
    BlogPost = apps.get_model("content", "BlogPost")
    Practice = apps.get_model("practice", "Practice")
    User = apps.get_model("users", "User")

    practice = Practice.objects.first()
    author = User.objects.filter(role="DOCTOR").first()
    if not practice or not author:
        return

    now = timezone.now()

    for post_data in POSTS:
        slug = post_data["slug"]
        if BlogPost.objects.filter(slug=slug).exists():
            continue

        BlogPost.objects.create(
            practice=practice,
            author=author,
            title=post_data["title"],
            slug=slug,
            excerpt=post_data["excerpt"],
            content=post_data["content"].strip(),
            is_published=True,
            published_at=now - timedelta(days=post_data["days_ago"]),
            tags=post_data["tags"],
            post_number=post_data["post_number"],
            meta_description=post_data["meta_description"],
        )


def unseed_posts(apps, schema_editor):
    BlogPost = apps.get_model("content", "BlogPost")
    slugs = [p["slug"] for p in POSTS]
    BlogPost.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0006_add_video_resource"),
        ("practice", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_posts, unseed_posts),
    ]
