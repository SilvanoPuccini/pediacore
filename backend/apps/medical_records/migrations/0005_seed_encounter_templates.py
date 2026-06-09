"""
Data migration: seed EncounterTemplate records for common pediatric encounter types.

Well-child visits cover RN through adolescence (Denver II milestones).
Morbidity templates cover the most common acute presentations.
"""

from django.db import migrations


NORMAL_EXAM_BASE = {
    "general_appearance": "Buen estado general, activo, reactivo, bien hidratado, bien perfundido",
    "skin": "Rosada, sin lesiones, sin ictericia, sin petequias",
    "head_neck": "Normocéfalo, fontanelas normotensas, cuello móvil sin adenopatías",
    "eyes": "Pupilas isocóricas reactivas, rojo pupilar bilateral presente, conjuntivas rosadas",
    "ears_nose_throat": "Oídos con CAE permeable, membranas timpánicas íntegras, mucosas rosadas, faringe sin eritema",
    "respiratory": "Murmullo vesicular simétrico, sin ruidos agregados, buena entrada de aire bilateral",
    "cardiovascular": "Ruidos cardíacos rítmicos en dos tiempos, sin soplos, pulsos periféricos presentes y simétricos",
    "abdomen": "Blando, depresible, no doloroso a la palpación, sin visceromegalias, RHA presentes",
    "genitourinary": "Genitales acorde a edad y sexo, sin alteraciones",
    "musculoskeletal": "Tono y fuerza muscular normales para la edad, movilidad articular conservada, sin deformidades",
    "neurological": "Alerta, orientado según edad, reflejos osteotendinosos presentes y simétricos",
    "lymph_nodes": "Sin adenopatías palpables significativas",
    "additional_findings": "",
}


def seed_templates(apps, schema_editor):
    EncounterTemplate = apps.get_model("medical_records", "EncounterTemplate")

    templates = [
        # -----------------------------------------------------------------------
        # WELL-CHILD VISITS
        # -----------------------------------------------------------------------
        {
            "name": "Control RN",
            "template_type": "WELL_CHILD",
            "age_range_label": "0-1 mes",
            "age_min_months": 0,
            "age_max_months": 1,
            "display_order": 1,
            "subjective_template": (
                "Recién nacido de [X] días/semanas de vida. Motivo: control de salud. "
                "Alimentación: lactancia materna exclusiva / mixta / fórmula [especificar]. "
                "Deposiciones: [frecuencia, características]. Diuresis: adecuada. "
                "Sueño: despertares nocturnos cada [X] horas. "
                "Muñón umbilical: [estado]. Sin intercurrencias desde el alta."
            ),
            "objective_template": (
                "RN reactivo, buen tono muscular, buen llanto, buen color. "
                "Peso: [X] kg. Talla: [X] cm. PC: [X] cm. "
                "Fontanela anterior normotensa, bregmática abierta. Suturas permeables. "
                "Rojo pupilar bilateral presente. Frenillo lingual sin restricción significativa."
            ),
            "assessment_template": (
                "Recién nacido sano. Crecimiento adecuado para la edad. "
                "Lactancia [establecida/en proceso de establecimiento]."
            ),
            "plan_template": (
                "1. Continuar lactancia materna exclusiva a libre demanda. "
                "2. Vitamina D 400 UI/día desde los primeros días si LME. "
                "3. Cuidados del muñón umbilical: limpieza con alcohol al 70%. "
                "4. Vacunas al día según PNI. "
                "5. Control próximo al mes de vida. "
                "6. Consulta SOS si: fiebre >38°C, ictericia progresiva, rechazo alimentario, llanto inconsolable."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "general_appearance": "Reactivo, buen tono muscular, buen llanto, buen color, bien hidratado",
                "skin": "Rosada, sin ictericia, puede presentar eritema tóxico neonatal benigno",
                "head_neck": "Fontanela anterior normotensa, suturas permeables, muñón umbilical sin signos de infección",
                "eyes": "Rojo pupilar bilateral presente, sin secreciones",
                "neurological": "Reflejos primitivos presentes: succión, búsqueda, Moro, prensión palmar y plantar",
            },
            "development_checklist": [
                "Fija la mirada brevemente",
                "Reacciona al sonido (se sobresalta o calma)",
                "Reflejo de succión presente y efectivo",
                "Reflejo de Moro presente",
                "Reflejo de prensión palmar presente",
                "Llanto fuerte y vigoroso",
                "Mueve las cuatro extremidades simétricamente",
            ],
        },
        {
            "name": "Control 1 mes",
            "template_type": "WELL_CHILD",
            "age_range_label": "1 mes",
            "age_min_months": 1,
            "age_max_months": 2,
            "display_order": 2,
            "subjective_template": (
                "Lactante de 1 mes de vida. Motivo: control de salud. "
                "Alimentación: LME / mixta / fórmula. Buen acople y vaciamiento mamario. "
                "Deposiciones: [frecuencia]. Diuresis: adecuada. "
                "Sueño: duerme entre tomas, despierta cada [X] horas. "
                "Sin intercurrencias. Padres sin preguntas o con dudas sobre [especificar]."
            ),
            "objective_template": (
                "Lactante en buen estado general, reactivo. "
                "Peso: [X] kg ([ganancia desde RN]). Talla: [X] cm. PC: [X] cm."
            ),
            "assessment_template": (
                "Lactante de 1 mes sano. Crecimiento pondoestatural adecuado. "
                "Desarrollo psicomotor acorde a la edad."
            ),
            "plan_template": (
                "1. Continuar LME a libre demanda. Vitamina D 400 UI/día. "
                "2. Vacunas: BCG y Hepatitis B al nacer (verificar). "
                "3. Estimulación: hablarle, cantarle, contacto cara a cara. "
                "4. Control próximo a los 2 meses. "
                "5. Consulta SOS si: fiebre, rechazo alimentario, ictericia."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "general_appearance": "Lactante reactivo, buen tono, buen color, bien hidratado",
                "neurological": "Fija mirada, sigue objeto a línea media, reflejos primitivos presentes",
            },
            "development_checklist": [
                "Fija la mirada y sigue objeto hasta línea media",
                "Responde al sonido de la voz",
                "Sonrisa social emergente (puede aparecer al mes)",
                "Levanta cabeza brevemente en posición prono",
                "Vocaliza sonidos guturales",
                "Mueve las cuatro extremidades",
            ],
        },
        {
            "name": "Control 2 meses",
            "template_type": "WELL_CHILD",
            "age_range_label": "2 meses",
            "age_min_months": 2,
            "age_max_months": 4,
            "display_order": 3,
            "subjective_template": (
                "Lactante de 2 meses. Motivo: control de salud. "
                "Alimentación: LME / mixta / fórmula [frecuencia y volumen]. "
                "Deposiciones normales, diuresis adecuada. "
                "Duerme [X] horas continuas. Sonríe e interactúa con la familia. "
                "Sin intercurrencias. Preguntas de los padres: [especificar]."
            ),
            "objective_template": (
                "Lactante reactivo, sonriente, buen tono. "
                "Peso: [X] kg. Talla: [X] cm. PC: [X] cm."
            ),
            "assessment_template": (
                "Lactante de 2 meses sano. Crecimiento adecuado. "
                "Desarrollo psicomotor normal para la edad."
            ),
            "plan_template": (
                "1. Continuar LME a libre demanda. Vitamina D 400 UI/día. "
                "2. Vacunas hoy: Hexavalente 1ª dosis + Neumocócica 10v 1ª dosis + Rotavirus 1ª dosis. "
                "   Informar reacciones esperadas: irritabilidad, fiebre leve, llanto post-vacuna. "
                "   Paracetamol 15 mg/kg si temperatura >38°C. "
                "3. Estimulación: tiempo boca abajo supervisado, móviles de colores, hablarle mucho. "
                "4. Control próximo a los 4 meses. "
                "5. Consulta SOS si: fiebre >38°C, llanto inconsolable >3h post-vacuna."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "neurological": "Sonrisa social presente, sigue objeto más allá de línea media, vocaliza",
            },
            "development_checklist": [
                "Sonrisa social espontánea",
                "Sigue objeto 180° con la mirada",
                "Vocaliza sonidos ('oo', 'aa')",
                "Levanta cabeza 45° en prono",
                "Responde al sonido girando la cabeza",
                "Manos abiertas la mayor parte del tiempo",
            ],
        },
        {
            "name": "Control 4 meses",
            "template_type": "WELL_CHILD",
            "age_range_label": "4 meses",
            "age_min_months": 4,
            "age_max_months": 6,
            "display_order": 4,
            "subjective_template": (
                "Lactante de 4 meses. Motivo: control de salud. "
                "Alimentación: LME / mixta / fórmula. Sin inicio de alimentación complementaria aún. "
                "Sueño: [X] horas nocturnas, [X] siestas diurnas. "
                "Se ríe, balbucea, reconoce a los padres. "
                "Sin intercurrencias. Preguntas: [especificar]."
            ),
            "objective_template": (
                "Lactante activo, sonriente, buen tono. "
                "Peso: [X] kg. Talla: [X] cm. PC: [X] cm."
            ),
            "assessment_template": (
                "Lactante de 4 meses sano. Crecimiento pondoestatural adecuado. "
                "Desarrollo psicomotor normal."
            ),
            "plan_template": (
                "1. Continuar LME exclusiva hasta los 6 meses. "
                "2. Vacunas hoy: Hexavalente 2ª dosis + Neumocócica 10v 2ª dosis + Rotavirus 2ª dosis. "
                "3. Estimulación: tiempo en prono supervisado, juguetes sonoros, espejo. "
                "4. Preparar para alimentación complementaria a los 6 meses. "
                "5. Hierro profiláctico si LME exclusiva: 1 mg/kg/día desde los 4 meses. "
                "6. Control próximo a los 6 meses. "
                "7. Consulta SOS si: fiebre, rechazo alimentario, irritabilidad marcada."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "neurological": "Ríe a carcajadas, balbucea, sostiene objetos brevemente, buen control cefálico",
                "musculoskeletal": "Buen tono, sostiene cabeza firme, se apoya sobre antebrazos en prono",
            },
            "development_checklist": [
                "Ríe a carcajadas",
                "Balbucea (ba, da, ga)",
                "Sostiene la cabeza firme sin apoyo",
                "Se apoya sobre antebrazos en prono levantando el pecho",
                "Agarra objetos y los lleva a la boca",
                "Reconoce rostros familiares",
                "Sigue objeto desaparecido brevemente con la mirada",
            ],
        },
        {
            "name": "Control 6 meses",
            "template_type": "WELL_CHILD",
            "age_range_label": "6 meses",
            "age_min_months": 6,
            "age_max_months": 9,
            "display_order": 5,
            "subjective_template": (
                "Lactante de 6 meses. Motivo: control de salud. "
                "Alimentación: LME / fórmula + inicio de alimentación complementaria [describir textura, alimentos introducidos, aceptación]. "
                "Sueño: [X] horas nocturnas. Se sienta con apoyo, juega con sus manos, balbucea. "
                "Sin intercurrencias. Preguntas sobre AC: [especificar]."
            ),
            "objective_template": (
                "Lactante activo, interactivo, buen tono. "
                "Peso: [X] kg. Talla: [X] cm. PC: [X] cm. "
                "Se sienta con apoyo mínimo. Toma objetos en ambas manos."
            ),
            "assessment_template": (
                "Lactante de 6 meses sano. Crecimiento adecuado. "
                "Inicio de alimentación complementaria. Desarrollo psicomotor normal."
            ),
            "plan_template": (
                "1. Alimentación complementaria guiada por el bebé (BLW) o papillas, según preferencia familiar. "
                "   Iniciar con verduras/frutas/cereales sin azúcar ni sal. Evitar miel, leche de vaca como bebida, alimentos ultraprocesados. "
                "   Mantener LM a demanda como alimento principal hasta los 12 meses. "
                "2. Hierro medicamentoso si LME: 1 mg/kg/día. Vitamina D continuar 400 UI/día. "
                "3. Vacunas hoy: Hexavalente 3ª dosis + Meningocócica C + Influenza 1ª dosis. "
                "4. Estimulación: sentarlo con apoyo, juegos de causa-efecto, nombres de objetos. "
                "5. Control próximo a los 9-12 meses. "
                "6. Consulta SOS si: fiebre, atragantamiento con alimentos, pérdida de hitos previos."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "neurological": "Se sienta con apoyo, transfiere objetos mano a mano, balbucea, responde a su nombre",
                "musculoskeletal": "Buen tono, se sienta con apoyo, carga peso en piernas al sostenerlo de pie",
            },
            "development_checklist": [
                "Se sienta con apoyo",
                "Transfiere objetos de una mano a la otra",
                "Balbucea sílabas (ba-ba, ma-ma, pa-pa sin significado)",
                "Responde a su nombre",
                "Busca objeto parcialmente escondido",
                "Come con cuchara, acepta nuevos sabores",
                "Pinza inferior emergente (rastrillo)",
            ],
        },
        {
            "name": "Control 12 meses",
            "template_type": "WELL_CHILD",
            "age_range_label": "12 meses",
            "age_min_months": 9,
            "age_max_months": 15,
            "display_order": 6,
            "subjective_template": (
                "Lactante de 12 meses. Motivo: control de salud. "
                "Alimentación: LM / fórmula + 3 comidas + 2 colaciones, dieta variada [describir]. "
                "Camina solo / con apoyo. Dice 1-3 palabras con significado. "
                "Sueño nocturno: [X] horas. Preguntas de los padres: [especificar]."
            ),
            "objective_template": (
                "Lactante activo, curioso, interactivo. "
                "Peso: [X] kg. Talla: [X] cm. PC: [X] cm. "
                "Camina [solo/con apoyo de muebles]. Pinza fina presente."
            ),
            "assessment_template": (
                "Lactante de 12 meses sano. Crecimiento adecuado. "
                "Desarrollo psicomotor normal para la edad."
            ),
            "plan_template": (
                "1. Transición a leche de vaca entera pasteurizada (si no continúa LM). Máximo 500 ml/día. "
                "2. Dieta familiar adaptada, sin azúcar añadida, sal mínima. Evitar choking hazards. "
                "3. Vacunas: SRP 1ª dosis + Varicela 1ª dosis + Hepatitis A. "
                "4. Estimulación: nombrar objetos y partes del cuerpo, libros con imágenes, juego libre. "
                "5. Límites de pantallas: evitar completamente <18 meses (excl. videollamadas). "
                "6. Flúor sistémico si agua sin flúor, desde la erupción del primer diente. "
                "7. Control próximo a los 18 meses. "
                "8. Consulta SOS si: pérdida de habilidades adquiridas, sin palabras a los 12m, no señala a los 12m."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "head_neck": "Fontanela anterior pequeña o cerrada, 6-8 dientes aproximadamente",
                "neurological": "Camina con o sin apoyo, pinza fina, dice mama/papa con significado, señala con índice",
                "musculoskeletal": "Marcha [independiente/con apoyo], buen tono, genu valgo fisiológico",
            },
            "development_checklist": [
                "Camina solo o con apoyo de muebles",
                "Pinza fina (pulgar-índice)",
                "Dice al menos 1-3 palabras con significado (mamá, papá, agua)",
                "Señala con el dedo índice para pedir o mostrar",
                "Imita gestos (aplaudir, adiós con la mano)",
                "Busca objeto completamente escondido (permanencia del objeto)",
                "Responde a instrucciones simples ('dame', 'ven')",
            ],
        },
        {
            "name": "Control 18 meses",
            "template_type": "WELL_CHILD",
            "age_range_label": "18 meses",
            "age_min_months": 15,
            "age_max_months": 24,
            "display_order": 7,
            "subjective_template": (
                "Niño/a de 18 meses. Motivo: control de salud. "
                "Alimentación: dieta variada, 3 comidas + 2 colaciones. Leche: [LM/fórmula/leche de vaca, cantidad]. "
                "Camina solo. Palabras: [número aproximado]. "
                "Control de esfínteres: [sin control / iniciando]. "
                "Sueño: [X] horas nocturnas + siesta. Pantallas: [tiempo/tipo]. "
                "Preguntas: [especificar]."
            ),
            "objective_template": (
                "Niño/a activo/a, explorador/a. "
                "Peso: [X] kg. Talla: [X] cm. PC: [X] cm. "
                "Camina bien solo/a. Vocabulario de [X] palabras aproximadamente."
            ),
            "assessment_template": (
                "Niño/a de 18 meses sano/a. Crecimiento adecuado. "
                "Desarrollo psicomotor [normal / con área a observar: especificar]."
            ),
            "plan_template": (
                "1. Alimentación: 3 comidas + 2 colaciones. Leche máx. 500 ml/día. Sin ultraprocesados. "
                "2. Estimulación: juego simbólico, rompecabezas simples, pintura dactilar, canciones. "
                "3. Inicio de control de esfínteres si hay signos de preparación (no antes de 18m). "
                "4. Límites de pantallas: máx. 1h/día de contenido de calidad a partir de los 2 años. "
                "5. Vacunas: SRP 1ª dosis (si no recibida a los 12m) + DPT booster. "
                "6. Cepillado dental 2x/día con pasta fluorada tamaño arroz. "
                "7. Control próximo a los 2 años. "
                "8. Alerta señales de autismo: sin lenguaje, sin juego imitativo, sin contacto visual."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "neurological": "Vocabulario activo >10 palabras, camina bien, sube escaleras con apoyo, juego funcional",
                "musculoskeletal": "Marcha independiente estable, genu valgo fisiológico, pie plano flexible",
            },
            "development_checklist": [
                "Camina bien de forma independiente",
                "Vocabulario activo de al menos 10 palabras",
                "Señala partes del cuerpo (nariz, orejas, ojos)",
                "Garabatea espontáneamente",
                "Sube escaleras con apoyo",
                "Juego funcional (alimenta muñecos, habla por teléfono de juguete)",
                "Obedece instrucciones de 2 pasos simples",
            ],
        },
        {
            "name": "Control 2-3 años",
            "template_type": "WELL_CHILD",
            "age_range_label": "2-3 años",
            "age_min_months": 24,
            "age_max_months": 48,
            "display_order": 8,
            "subjective_template": (
                "Niño/a de [X] años. Motivo: control de salud. "
                "Alimentación: dieta familiar variada, come solo/a [con/sin dificultades]. "
                "Control de esfínteres: [diurno logrado / nocturno en proceso / sin lograr]. "
                "Lenguaje: frases de [X] palabras, comprensible para extraños [sí/no]. "
                "Jardín infantil / sala cuna: [asiste/no]. "
                "Pantallas: [horas/día, contenido]. Preguntas: [especificar]."
            ),
            "objective_template": (
                "Niño/a cooperador/a, juguetón/a. "
                "Peso: [X] kg. Talla: [X] cm. IMC: [X] kg/m²."
            ),
            "assessment_template": (
                "Niño/a de [X] años sano/a. Crecimiento adecuado. "
                "Desarrollo psicomotor [normal / con área a observar]."
            ),
            "plan_template": (
                "1. Alimentación: 4-5 comidas estructuradas/día. Sin jugos azucarados. Agua como bebida principal. "
                "2. Actividad física: juego libre al aire libre al menos 3h/día. "
                "3. Pantallas: máx. 1h/día, siempre con adulto, sin pantallas en la cama ni durante comidas. "
                "4. Control de esfínteres: estrategias de apoyo [según estado]. "
                "5. Lenguaje: lectura en voz alta diaria, narración de cuentos, canciones. "
                "6. Vacunas: DPT-IPV booster a los 4 años (si corresponde). "
                "7. Odontológico: control dental 2x/año. Pasta fluorada tamaño arveja. "
                "8. Control próximo a los 3-4 años."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "neurological": "Lenguaje en frases, nombra colores, juego simbólico elaborado, coordinación acorde a edad",
                "musculoskeletal": "Marcha madura, sube y baja escaleras alternando pies, corre, salta",
            },
            "development_checklist": [
                "Habla en frases de 3-4 palabras (2 años) / oraciones completas (3 años)",
                "Comprensible para extraños al 50% (2 años) / 75% (3 años)",
                "Nombra objetos en imágenes",
                "Sube y baja escaleras alternando los pies",
                "Copia círculo (3 años)",
                "Juego simbólico elaborado (juega 'a la cocina', 'a los doctores')",
                "Control de esfínteres diurno logrado o en proceso",
                "Se viste con poca ayuda",
            ],
        },
        {
            "name": "Control 4-5 años",
            "template_type": "WELL_CHILD",
            "age_range_label": "4-5 años",
            "age_min_months": 48,
            "age_max_months": 72,
            "display_order": 9,
            "subjective_template": (
                "Niño/a de [X] años. Motivo: control de salud. "
                "Alimentación: dieta variada, come solo/a sin dificultades. "
                "Jardín / prekinder: [asiste, cómo le va, relación con pares]. "
                "Sueño: [X] horas nocturnas, sin siesta. "
                "Pantallas: [horas/día, tipo de contenido]. "
                "Preguntas sobre la entrada al colegio / lectoescritura: [especificar]."
            ),
            "objective_template": (
                "Niño/a colaborador/a, comunicativo/a. "
                "Peso: [X] kg. Talla: [X] cm. IMC: [X] kg/m². "
                "Agudeza visual y audición evaluadas [resultado]."
            ),
            "assessment_template": (
                "Niño/a de [X] años sano/a. Crecimiento adecuado. "
                "Desarrollo psicomotor y lenguaje acorde a la edad. "
                "[Apto/No apto para inicio escolar según evaluación]."
            ),
            "plan_template": (
                "1. Alimentación: dieta mediterránea adaptada, colaciones saludables, agua como bebida. "
                "2. Actividad física: al menos 1h de actividad moderada-vigorosa diaria, juego al aire libre. "
                "3. Pantallas: máx. 1-2h/día, contenido educativo o de entretenimiento de calidad. "
                "4. Vacunas 4 años: DPT-IPV booster + SRP 2ª dosis. "
                "5. Preparación para el colegio: habilidades de autonomía (vestirse, ir al baño solo/a, nombre completo). "
                "6. Salud bucal: pasta fluorada 1000 ppm, supervisión del cepillado. "
                "7. Evaluación de visión y audición previo ingreso escolar. "
                "8. Control próximo a los 6 años / ingreso escolar."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "eyes": "Agudeza visual evaluada, sin estrabismo, rojo pupilar bilateral",
                "ears_nose_throat": "Audición conservada, amígdalas [grado], sin obstrucción nasal",
                "neurological": "Lenguaje fluido, cuenta hasta 10, reconoce letras/números, coordinación fina adecuada",
                "musculoskeletal": "Marcha madura, salta en un pie, trepa, lanza pelota con precisión",
            },
            "development_checklist": [
                "Habla con oraciones completas y gramática correcta",
                "Cuenta objetos hasta 10",
                "Reconoce algunas letras y su nombre escrito",
                "Copia cruz y cuadrado",
                "Salta en un pie mínimo 5 veces",
                "Se viste y desviste solo/a",
                "Juega en grupo con reglas simples",
                "Diferencia fantasía de realidad",
                "Conoce su nombre completo y dirección",
            ],
        },
        {
            "name": "Control escolar 6-12 años",
            "template_type": "WELL_CHILD",
            "age_range_label": "6-12 años",
            "age_min_months": 72,
            "age_max_months": 144,
            "display_order": 10,
            "subjective_template": (
                "Niño/a de [X] años. Motivo: control de salud. "
                "Escolaridad: [curso, rendimiento, relación con pares y profesores]. "
                "Alimentación: [desayuno antes del colegio, colación, almuerzo, cena — calidad y variedad]. "
                "Actividad física extraescolar: [tipo, frecuencia]. "
                "Sueño: [X] horas nocturnas, hora de acostarse. "
                "Pantallas: [horas/día, tipo — redes sociales, videojuegos, streaming]. "
                "Signos puberales: [Tanner I / inicio desarrollo mamario / vello pubiano]. "
                "Preguntas: [especificar]."
            ),
            "objective_template": (
                "Escolar colaborador/a, buen ánimo. "
                "Peso: [X] kg. Talla: [X] cm. IMC: [X] kg/m². Percentil IMC: [X]. "
                "PA: [X/X] mmHg. Tanner: [I/II/III]. "
                "Curva de crecimiento: [adecuada / aceleración / desaceleración]."
            ),
            "assessment_template": (
                "Escolar de [X] años sano/a. Crecimiento pondoestatural [adecuado/evaluar]. "
                "IMC [normal/sobrepeso/obesidad]. "
                "Desarrollo puberal [acorde a edad / adelantado / retrasado]."
            ),
            "plan_template": (
                "1. Alimentación: desayuno completo (lácteo + cereal integral + fruta), evitar ultraprocesados. "
                "   Colación escolar saludable: fruta, frutos secos, yogur. "
                "2. Actividad física: mínimo 60 min/día de actividad moderada-vigorosa. Deporte extraescolar recomendado. "
                "3. Pantallas: máx. 2h/día de entretenimiento (no incluye tareas). Sin pantallas 1h antes de dormir. "
                "4. Sueño: 9-11 horas (6-12 años). Rutina estable de sueño. "
                "5. Pubertad: orientación anticipada según estadio Tanner. "
                "6. Salud mental: preguntar por ánimo, relaciones sociales, bullying. "
                "7. Vacunas: Influenza anual. VPH a los 9-10 años según PNI. "
                "8. Control anual o según necesidad."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "general_appearance": "Escolar en buen estado general, colaborador, buen ánimo",
                "eyes": "Agudeza visual conservada, sin estrabismo",
                "ears_nose_throat": "Audición conservada, amígdalas [grado], caries [presentes/ausentes]",
                "cardiovascular": "Ruidos cardíacos rítmicos, sin soplos, PA dentro de percentil normal para edad y talla",
                "musculoskeletal": "Sin escoliosis (Adams test negativo), caderas simétricas, pies planos [flexible/rígido]",
                "neurological": "Orientado en persona/tiempo/espacio, lenguaje normal, coordinación fina y gruesa adecuada",
                "additional_findings": "Tanner: [estadio]. Tiroides: sin bocio palpable.",
            },
            "development_checklist": [
                "Rendimiento escolar acorde al curso",
                "Relaciones sociales adecuadas con pares",
                "Autonomía en actividades escolares (tareas, organización)",
                "Sin signos de bullying ni exclusión social",
                "Ánimo estable, sin tristeza persistente ni ansiedad",
                "Hábitos de sueño regulares",
                "Actividad física regular",
            ],
        },
        {
            "name": "Control adolescente 12-18 años",
            "template_type": "WELL_CHILD",
            "age_range_label": "12-18 años",
            "age_min_months": 144,
            "age_max_months": 216,
            "display_order": 11,
            "subjective_template": (
                "Adolescente de [X] años. Motivo: control de salud. "
                "Escolaridad: [curso, rendimiento, proyecto de vida]. "
                "Alimentación: [describe patrón alimentario, dietas restrictivas]. "
                "Actividad física: [tipo, frecuencia]. "
                "Sueño: [X] horas, hora de acostarse. "
                "Pantallas / redes sociales: [plataformas, horas/día]. "
                "Salud mental: [ánimo, ansiedad, relaciones familiares y con pares]. "
                "Conductas de riesgo (HEADS): hogar, educación, actividades, drogas, sexualidad, suicidio. "
                "Menarca / desarrollo puberal: [fecha, regularidad menstrual si aplica]. "
                "Preguntas: [especificar]."
            ),
            "objective_template": (
                "Adolescente colaborador/a. "
                "Peso: [X] kg. Talla: [X] cm. IMC: [X] kg/m². Percentil IMC: [X]. "
                "PA: [X/X] mmHg. FC: [X] lpm. "
                "Tanner: [estadio mamario/vello pubiano/genital]."
            ),
            "assessment_template": (
                "Adolescente de [X] años sano/a. Crecimiento adecuado. "
                "Tanner [estadio] acorde a edad. "
                "Sin señales de conductas de riesgo / [señales detectadas: especificar]."
            ),
            "plan_template": (
                "1. Alimentación: dieta variada, sin restricciones extremas, suplemento hierro en menstruantes si anemia. "
                "2. Actividad física: 60 min/día mínimo. Desestimular sedentarismo. "
                "3. Sueño: 8-10 horas. Higiene del sueño: sin pantallas 1h antes de dormir. "
                "4. Salud mental: recursos disponibles, línea de crisis 600 360 7777. "
                "5. Sexualidad y anticoncepción: orientación según necesidad, confidencialidad garantizada. "
                "6. Conductas de riesgo: consejería breve sobre tabaco, alcohol, drogas. "
                "7. Vacunas: VPH 2 dosis (9-14 años) / 3 dosis (≥15 años). dTpa booster si no recibido. Influenza anual. "
                "8. Control anual mientras no haya problemas, o según necesidad."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "general_appearance": "Adolescente en buen estado general, colaborador/a, ánimo [eutímico/ansioso/triste]",
                "skin": "Sin acné significativo / acné leve-moderado-severo en [zona]. Sin autolesiones visibles.",
                "head_neck": "Tiroides sin bocio palpable, sin adenopatías significativas",
                "cardiovascular": "Ruidos cardíacos rítmicos, sin soplos, PA dentro de rango normal",
                "musculoskeletal": "Sin escoliosis (Adams test negativo), columna alineada, sin dolor articular",
                "neurological": "Orientado, juicio y lenguaje adecuados, coordinación conservada",
                "additional_findings": "Tanner: [estadio]. Examen genital si indicado clínicamente.",
            },
            "development_checklist": [
                "Rendimiento escolar estable",
                "Relaciones sociales apropiadas",
                "Ánimo estable sin signos de depresión/ansiedad",
                "Sin conductas de riesgo identificadas (HEADS negativo)",
                "Hábitos de sueño regulares (≥8h)",
                "Actividad física regular",
                "Autonomía progresiva en cuidado personal",
                "Proyecto de vida en construcción",
            ],
        },

        # -----------------------------------------------------------------------
        # MORBIDITY TEMPLATES
        # -----------------------------------------------------------------------
        {
            "name": "Consulta respiratoria",
            "template_type": "MORBIDITY",
            "age_range_label": "",
            "age_min_months": None,
            "age_max_months": None,
            "display_order": 1,
            "subjective_template": (
                "Motivo: [tos / congestión nasal / dificultad respiratoria / fiebre]. "
                "Inicio hace [X] días. Fiebre: [máx. temperatura, frecuencia, respuesta a antipiréticos]. "
                "Tos: [seca/productiva, frecuencia, nocturna]. "
                "Congestión nasal: [secreción hialina/purulenta/serosa]. "
                "Dificultad respiratoria: [sí/no, sibilancias audibles]. "
                "Contacto con enfermos: [sí/no]. "
                "Vacunas al día [sí/no]. Alergias conocidas: [especificar]."
            ),
            "objective_template": (
                "T°: [X]°C. FR: [X] rpm. SpO2: [X]% ambiental. FC: [X] lpm. "
                "Faringe: [eritematosa/normal, amígdalas con/sin exudado]. "
                "Oídos: [membranas íntegras/eritematosas/con efusión]. "
                "Murmullo vesicular: [simétrico / disminuido en [zona]]. "
                "Ruidos agregados: [ausentes / sibilancias espiratorias / crepitaciones]. "
                "Tiraje: [ausente / subcostal / intercostal / supraclavicular]."
            ),
            "assessment_template": (
                "[Infección respiratoria alta (resfrío común) / Faringoamigdalitis [viral/bacteriana] / "
                "Otitis media aguda / Laringitis obstructiva grado [I/II/III] / "
                "Síndrome bronquial obstructivo [leve/moderado/severo] / Neumonía / Influenza]. "
                "Severidad: [leve/moderada/severa]."
            ),
            "plan_template": (
                "1. Tratamiento sintomático: paracetamol 15 mg/kg/dosis c/6-8h si T° >38°C o dolor. "
                "   Ibuprofeno 10 mg/kg/dosis c/8h como alternativa (>3 meses, sin contraindicaciones). "
                "2. Hidratación adecuada, suero fisiológico nasal. "
                "3. [Si laringitis: budesonida nebulizada / dexametasona IM según grado]. "
                "4. [Si SBO: broncodilatador salbutamol 0.15 mg/kg neb / 2-4 puff + espaciador]. "
                "5. [Si bacteriana confirmada / criterios: amoxicilina [X] mg/kg/día en 2-3 dosis x 7-10 días]. "
                "6. Consulta SOS si: dificultad respiratoria progresiva, SpO2 <95%, cianosis, mal estado general."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "ears_nose_throat": "Congestión nasal con secreción [hialina/purulenta], faringe [eritematosa/normal], amígdalas [normales/con exudado], membranas timpánicas [íntegras/eritematosas]",
                "respiratory": "[Murmullo vesicular simétrico / Sibilancias espiratorias difusas / Crepitaciones en [zona]]. Sin tiraje / Con tiraje [grado].",
            },
            "development_checklist": [],
        },
        {
            "name": "Consulta gastrointestinal",
            "template_type": "MORBIDITY",
            "age_range_label": "",
            "age_min_months": None,
            "age_max_months": None,
            "display_order": 2,
            "subjective_template": (
                "Motivo: [vómitos / diarrea / dolor abdominal / fiebre]. "
                "Inicio hace [X] horas/días. "
                "Vómitos: [número/día, contenido, proyectivos/en escopeta]. "
                "Diarrea: [número/día, consistencia, con/sin moco, con/sin sangre]. "
                "Dolor abdominal: [localización, tipo, intensidad 1-10, continuo/cólico]. "
                "Fiebre: [máx. temperatura]. "
                "Tolerancia oral: [sí/no, qué tolera]. "
                "Diuresis última: hace [X] horas. "
                "Contacto con enfermos o alimentos en mal estado."
            ),
            "objective_template": (
                "T°: [X]°C. FC: [X] lpm. Estado de hidratación: [bien hidratado / deshidratación leve-moderada-severa]. "
                "Mucosas [húmedas/secas]. Signo del pliegue [negativo/positivo]. Llanto [con/sin lágrimas]. "
                "Abdomen: [blando, depresible / dolor a la palpación en [zona] / signos peritoneales]. "
                "RHA: [presentes/aumentados/disminuidos]."
            ),
            "assessment_template": (
                "[Gastroenteritis aguda (GEA) viral / GEA bacteriana / "
                "Deshidratación [leve/moderada/severa] secundaria a GEA / "
                "Vómitos a descartar causa [especificar] / "
                "Dolor abdominal a estudiar]."
            ),
            "plan_template": (
                "1. Rehidratación oral: suero de rehidratación oral (SRO) 5-10 ml/kg/h por 4 horas si deshidratación leve-moderada. "
                "   Ofrecer frecuente y en pequeñas cantidades. "
                "2. Continuar alimentación habitual según tolerancia (no ayuno prolongado). "
                "   LM continuar a demanda. "
                "3. Zinc elemental 20 mg/día x 10-14 días en >6 meses (si GEA bacteriana o prolongada). "
                "4. Ondansetrón 0.15 mg/kg/dosis (máx 4 mg) si vómitos que impiden rehidratación oral. "
                "5. No usar antidiarreicos. "
                "6. Consulta SOS / urgencia si: signos de deshidratación grave, sangre en deposiciones, "
                "   vómitos biliosos, dolor abdominal intenso localizado, letargia, sin orina en 8h."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "abdomen": "[Blando, depresible / Dolor a la palpación en [zona]], RHA aumentados, sin signos peritoneales. Signo del pliegue negativo.",
            },
            "development_checklist": [],
        },
        {
            "name": "Consulta dermatológica",
            "template_type": "MORBIDITY",
            "age_range_label": "",
            "age_min_months": None,
            "age_max_months": None,
            "display_order": 3,
            "subjective_template": (
                "Motivo: [erupción / picazón / lesión cutánea]. "
                "Inicio hace [X] días. Localización: [zona/s afectada/s]. "
                "Características: [eritematosa / vesicular / costrosa / purpúrica / urticariforme]. "
                "Prurito: [intenso/moderado/ausente]. "
                "Fiebre asociada: [sí/no, temperatura]. "
                "Exposición previa a: [nuevos alimentos, jabones, detergentes, plantas, insectos, medicamentos]. "
                "Contacto con enfermos: [sí/no]. "
                "Antecedentes de atopia / eccema / asma / rinitis: [sí/no]."
            ),
            "objective_template": (
                "T°: [X]°C. "
                "Lesiones: [morfología — mácula/pápula/vesícula/pústula/costra/placa]. "
                "Distribución: [localizada/generalizada/simétrica/en dermátomo]. "
                "Localización: [tronco/extremidades/cara/cuero cabelludo/pliegues]. "
                "Caracteres: [eritematosas/costrosas/húmedas/secas/con descamación]. "
                "Adenopatías regionales: [presentes/ausentes]. "
                "Afectación mucosas: [sí/no]."
            ),
            "assessment_template": (
                "[Dermatitis atópica / Urticaria aguda / Impétigo / Varicela / Exantema viral inespecífico / "
                "Dermatitis de contacto / Tiña [capitis/corporis/pedis] / Pitiriasis alba / "
                "Molluscum contagioso / Escabiosis — a confirmar con evolución clínica]."
            ),
            "plan_template": (
                "1. [Si dermatitis atópica: emoliente sin fragancia 2x/día + corticoide tópico hidrocortisona 1% o betametasona 0.05% en brotes]. "
                "2. [Si urticaria: cetirizina 0.25 mg/kg/dosis 1x/día o loratadina 0.2 mg/kg/día]. "
                "3. [Si impétigo localizado: ácido fusídico tópico 3x/día x 7 días / amoxicilina-clavulánico si extenso]. "
                "4. [Si varicela: antihistamínico para el prurito, aciclovir si inmunocomprometido o >12 años]. "
                "5. Uñas cortas para minimizar lesiones por rascado. "
                "6. Ropa de algodón, evitar lana y sintéticos en piel sensible. "
                "7. Consulta SOS si: fiebre alta, lesiones en mucosas, extensión rápida, mal estado general."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "skin": "[Lesiones descritas: morfología, distribución, características]. Sin afectación mucosa.",
                "lymph_nodes": "[Sin adenopatías / Adenopatías regionales en [zona], móviles, no dolorosas]",
            },
            "development_checklist": [],
        },
        {
            "name": "Consulta por fiebre",
            "template_type": "MORBIDITY",
            "age_range_label": "",
            "age_min_months": None,
            "age_max_months": None,
            "display_order": 4,
            "subjective_template": (
                "Motivo: fiebre. "
                "Temperatura máxima: [X]°C registrada con termómetro [axilar/rectal/frontal]. "
                "Inicio hace [X] horas/días. Continua/intermitente. "
                "Respuesta a antipiréticos: [buena/parcial/nula]. "
                "Síntomas acompañantes: [tos/secreción nasal/odinofagia/otalgia/exantema/vómitos/diarrea/disuria]. "
                "Estado general entre las fiebres: [activo/decaído/somnoliento]. "
                "Diuresis: [normal/disminuida/última micción hace X horas]. "
                "Contacto con enfermos. Viajes recientes. Vacunas al día [sí/no]."
            ),
            "objective_template": (
                "T°: [X]°C. FC: [X] lpm. FR: [X] rpm. SpO2: [X]% ambiental. "
                "Estado general: [buen aspecto / mal aspecto, toxic-looking]. "
                "Hidratación: [adecuada/déficit leve/moderado]. "
                "Foco infeccioso: [identificado en: / sin foco evidente]. "
                "Faringe: [normal/eritematosa/con exudado]. Oídos: [normales/otitis]. "
                "Adenopatías: [ausentes / presentes en zona]. "
                "Exantema: [presente/ausente, descripción]."
            ),
            "assessment_template": (
                "Fiebre [de X días de evolución] con foco [identificado: / sin foco aparente]. "
                "[Síndrome febril a estudio / Infección viral / bacteriana]. "
                "Riesgo [bajo/intermedio/alto] según criterios clínicos y edad."
            ),
            "plan_template": (
                "1. Antipiréticos: paracetamol 15 mg/kg/dosis c/6-8h solo si T° >38°C o malestar. "
                "   Ibuprofeno 10 mg/kg/dosis c/8h como alternativa (>3 meses). No alternancia rutinaria. "
                "2. Hidratación oral aumentada. Continuar alimentación habitual si tolera. "
                "3. [Si foco bacteriano identificado: antibiótico específico]. "
                "4. [Si sin foco y buen estado general: manejo expectante con control en [X] horas/días]. "
                "5. Exámenes: [ninguno necesario / hemograma + PCR / orina completa + urocultivo / según clínica]. "
                "6. Consulta SOS / urgencia INMEDIATA si: "
                "   - <3 meses con T° ≥38°C → URGENCIA siempre. "
                "   - Mal estado general, letargia, no consolable. "
                "   - Rash purpúrico o petequias. "
                "   - Rigidez de nuca. "
                "   - Fiebre >5 días. "
                "   - Dificultad respiratoria o hipoxia."
            ),
            "physical_exam_template": {
                **NORMAL_EXAM_BASE,
                "general_appearance": "[Buen aspecto, activo y reactivo / Decaído, hipoactivo — buen estado general entre fiebres]",
                "skin": "[Sin exantema / Exantema presente: descripción morfología y distribución]",
                "ears_nose_throat": "[Normal / Faringe eritematosa con exudado / Membranas timpánicas eritematosas con efusión]",
                "lymph_nodes": "[Sin adenopatías significativas / Adenopatías en zona concordante con foco]",
            },
            "development_checklist": [],
        },
    ]

    EncounterTemplate.objects.bulk_create(
        [EncounterTemplate(**t) for t in templates],
        ignore_conflicts=True,
    )


def reverse_seed(apps, schema_editor):
    """Remove seeded templates by name (idempotent reverse)."""
    EncounterTemplate = apps.get_model("medical_records", "EncounterTemplate")
    names = [
        "Control RN", "Control 1 mes", "Control 2 meses", "Control 4 meses",
        "Control 6 meses", "Control 12 meses", "Control 18 meses",
        "Control 2-3 años", "Control 4-5 años", "Control escolar 6-12 años",
        "Control adolescente 12-18 años",
        "Consulta respiratoria", "Consulta gastrointestinal",
        "Consulta dermatológica", "Consulta por fiebre",
    ]
    EncounterTemplate.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("medical_records", "0004_encounter_template"),
    ]

    operations = [
        migrations.RunPython(seed_templates, reverse_code=reverse_seed),
    ]
