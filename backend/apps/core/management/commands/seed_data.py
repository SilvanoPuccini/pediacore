"""
Management command to seed the database with realistic demo data for PEDIACORE.

Usage:
    python manage.py seed_data           # idempotent — safe to run multiple times
    python manage.py seed_data --flush   # delete all seeded data first, then recreate
"""

from __future__ import annotations

import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Populate the database with realistic demo data for PEDIACORE."

    # ------------------------------------------------------------------
    # CLI options
    # ------------------------------------------------------------------

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing seeded data before recreating it.",
        )

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        doctor = self._seed_doctor()
        practice = self._seed_practice(doctor)
        location_pucon, location_villarrica = self._seed_locations(practice)
        self._seed_services(practice, location_pucon, location_villarrica)
        self._seed_working_hours(practice, location_pucon, location_villarrica)
        self._seed_blog_posts(practice, doctor)
        self._seed_faqs(practice)
        self._seed_cancellation_policy(practice)
        self._seed_auto_responder(practice)
        self._seed_tutor_and_patients(practice)

        self.stdout.write(self.style.SUCCESS("\n✓ Seed completado exitosamente."))

    # ------------------------------------------------------------------
    # Flush
    # ------------------------------------------------------------------

    def _flush(self):
        """Delete all seeded data. Order matters due to FK constraints."""
        from apps.content.models import BlogPost, FAQ
        from apps.patients.models import Patient, TutorPatient
        from apps.practice.models import (
            Location,
            Practice,
            Service,
            WorkingHours,
        )
        from apps.scheduling.models import (
            AutoResponderConfig,
            CancellationPolicy,
        )
        from apps.users.models import User

        self.stdout.write("Eliminando datos existentes...")

        # Delete in dependency order
        TutorPatient.objects.all().delete()
        Patient.objects.all().delete()
        FAQ.objects.filter(practice__slug="dra-estefi").delete()
        BlogPost.objects.filter(practice__slug="dra-estefi").delete()

        try:
            practice = Practice.objects.get(slug="dra-estefi")
            AutoResponderConfig.objects.filter(practice=practice).delete()
            CancellationPolicy.objects.filter(practice=practice).delete()
            WorkingHours.objects.filter(practice=practice).delete()
            Service.objects.filter(practice=practice).delete()
            Location.objects.filter(practice=practice).delete()
            practice.hard_delete()
        except Practice.DoesNotExist:
            pass

        User.objects.filter(
            email__in=["doctor@estefipediatra.com", "tutor@demo.com"]
        ).delete()

        self.stdout.write(self.style.WARNING("Datos previos eliminados."))

    # ------------------------------------------------------------------
    # Doctor user
    # ------------------------------------------------------------------

    def _seed_doctor(self):
        from apps.users.models import User

        doctor, created = User.objects.get_or_create(
            email="doctor@estefipediatra.com",
            defaults={
                "first_name": "Estefanía",
                "last_name": "Riquelme",
                "phone": "+56 9 8765 4321",
                "role": User.DOCTOR,
                "is_staff": True,
                "is_active": True,
                "email_verified_at": timezone.now(),
            },
        )
        if created:
            doctor.set_password("PediaCore2024!")
            doctor.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS("  [+] Doctor creado: doctor@estefipediatra.com"))
        else:
            self.stdout.write("  [=] Doctor ya existe: doctor@estefipediatra.com")

        return doctor

    # ------------------------------------------------------------------
    # Practice
    # ------------------------------------------------------------------

    def _seed_practice(self, doctor):
        from apps.practice.models import Practice

        practice, created = Practice.objects.get_or_create(
            slug="dra-estefi",
            defaults={
                "name": "Dra. Estefanía - Pediatría",
                "description": (
                    "Consultorio pediátrico de la Dra. Estefanía Riquelme, especialista en "
                    "pediatría con más de 10 años de experiencia. Atención integral para "
                    "niñas y niños desde el nacimiento hasta los 15 años, con enfoque en "
                    "desarrollo infantil, nutrición y prevención. Dos sedes en la región "
                    "de La Araucanía: Pucón y Villarrica."
                ),
                "email": "contacto@estefipediatra.com",
                "phone": "+56 9 8765 4321",
                "website": "https://estefipediatra.com",
                "is_active": True,
                "owner": doctor,
            },
        )
        label = "[+] Practice creada" if created else "[=] Practice ya existe"
        self.stdout.write(self.style.SUCCESS(f"  {label}: {practice.name}"))
        return practice

    # ------------------------------------------------------------------
    # Locations
    # ------------------------------------------------------------------

    def _seed_locations(self, practice):
        from apps.practice.models import Location

        location_pucon, created = Location.objects.get_or_create(
            practice=practice,
            slug="pucon",
            defaults={
                "name": "Centro Clínico Terapéutico El Valle Pucón",
                "address": "Gral. Urrutia 291, Of. 4, 4920000 Pucón",
                "city": "Pucón",
                "region": "Araucanía",
                "phone": "+56 45 244 3100",
                "email": "pucon@estefipediatra.com",
                "latitude": Decimal("-39.2758048"),
                "longitude": Decimal("-71.9766482"),
                "display_hours": "Lun – Vie · 09:00 – 13:00 y 15:00 – 19:00",
                "is_active": True,
            },
        )
        label = "[+] Location creada" if created else "[=] Location ya existe"
        self.stdout.write(self.style.SUCCESS(f"  {label}: {location_pucon.name}"))

        location_villarrica, created = Location.objects.get_or_create(
            practice=practice,
            slug="villarrica",
            defaults={
                "name": "Centro Materno Pediátrico Almainfancia",
                "address": "Valentín Letelier 921, 4930000 Villarrica",
                "city": "Villarrica",
                "region": "Araucanía",
                "phone": "+56 45 241 2200",
                "email": "villarrica@estefipediatra.com",
                "latitude": Decimal("-39.2828412"),
                "longitude": Decimal("-72.2239914"),
                "display_hours": "Lun, Mié, Vie · 09:00 – 13:00",
                "is_active": True,
            },
        )
        label = "[+] Location creada" if created else "[=] Location ya existe"
        self.stdout.write(self.style.SUCCESS(f"  {label}: {location_villarrica.name}"))

        return location_pucon, location_villarrica

    # ------------------------------------------------------------------
    # Services
    # ------------------------------------------------------------------

    def _seed_services(self, practice, location_pucon, location_villarrica):
        from apps.practice.models import Service

        services_data = [
            {
                "name": "Control Niño Sano",
                "slug": "control-nino-sano",
                "description": (
                    "Evaluación integral del crecimiento y desarrollo infantil con "
                    "enfoque integrativo y funcional. Revisión de antecedentes, "
                    "seguimiento del crecimiento y desarrollo, evaluación de hábitos, "
                    "alimentación y sueño. Se despejan todas las dudas."
                ),
                "duration_minutes": 45,
                "price_clp": 40000,
                "modality": "AMBAS",
                "display_order": 1,
                "locations": [location_pucon, location_villarrica],
            },
            {
                "name": "Control por Enfermedad (Particular)",
                "slug": "consulta-enfermedad-particular",
                "description": (
                    "Consulta médica para diagnóstico y manejo de enfermedades agudas "
                    "y crónicas infantiles, abordadas desde una mirada integrativa y "
                    "funcional. Si se requieren exámenes, su revisión posterior NO "
                    "tiene costo adicional (se incluye dentro de la misma consulta)."
                ),
                "duration_minutes": 45,
                "price_clp": 40000,
                "modality": "AMBAS",
                "display_order": 2,
                "locations": [location_pucon, location_villarrica],
            },
            {
                "name": "Control por Enfermedad (FONASA)",
                "slug": "consulta-enfermedad-fonasa",
                "description": (
                    "Evaluación médica y tratamiento de patologías agudas infantiles "
                    "con cobertura FONASA. Requiere presentar certificado de afiliación "
                    "FONASA vigente del paciente al momento de la consulta."
                ),
                "duration_minutes": 45,
                "price_clp": 32000,
                "modality": "AMBAS",
                "requires_fonasa_validation": True,
                "display_order": 3,
                "locations": [location_pucon, location_villarrica],
            },
            {
                "name": "Asesoría de Lactancia",
                "slug": "asesoria-lactancia",
                "description": (
                    "Acompañamiento personalizado en lactancia materna y resolución "
                    "de dificultades. Incluye evaluación de la técnica, posiciones, "
                    "frecuencia y resolución de problemas comunes."
                ),
                "duration_minutes": 45,
                "price_clp": 40000,
                "modality": "AMBAS",
                "display_order": 4,
                "locations": [location_pucon, location_villarrica],
            },
            {
                "name": "Curso RCP Infantil",
                "slug": "curso-rcp-infantil",
                "description": (
                    "Capacitación práctica en primeros auxilios y reanimación "
                    "cardiopulmonar en niños. Coordinar día y horario directamente "
                    "con el centro."
                ),
                "duration_minutes": 120,
                "price_clp": 60000,
                "modality": "PRESENCIAL",
                "requires_manual_coordination": True,
                "display_order": 5,
                "locations": [location_pucon, location_villarrica],
            },
        ]

        for data in services_data:
            locations = data.pop("locations")
            service, created = Service.objects.get_or_create(
                practice=practice,
                slug=data["slug"],
                defaults={**data, "practice": practice, "is_active": True},
            )
            if created:
                service.locations.set(locations)
                self.stdout.write(self.style.SUCCESS(f"  [+] Servicio creado: {service.name}"))
            else:
                self.stdout.write(f"  [=] Servicio ya existe: {service.name}")

    # ------------------------------------------------------------------
    # Working hours
    # ------------------------------------------------------------------

    def _seed_working_hours(self, practice, location_pucon, location_villarrica):
        """
        Pucón:     Lun–Vie 09:00–19:00 (único bloque por día — modelo no soporta múltiples turnos)
        Villarrica: Lun, Mié, Vie 09:00–13:00
        """
        from apps.practice.models import WorkingHours

        # Pucón: Monday–Friday
        pucon_days = [
            WorkingHours.MONDAY,
            WorkingHours.TUESDAY,
            WorkingHours.WEDNESDAY,
            WorkingHours.THURSDAY,
            WorkingHours.FRIDAY,
        ]
        for day in pucon_days:
            wh, created = WorkingHours.objects.get_or_create(
                location=location_pucon,
                day_of_week=day,
                defaults={
                    "practice": practice,
                    "start_time": datetime.time(9, 0),
                    "end_time": datetime.time(19, 0),
                    "is_active": True,
                },
            )
            if created:
                day_label = wh.get_day_of_week_display()
                self.stdout.write(
                    self.style.SUCCESS(f"  [+] Horario Pucón {day_label}: 09:00–19:00")
                )

        # Villarrica: Monday, Wednesday, Friday
        villarrica_days = [
            WorkingHours.MONDAY,
            WorkingHours.WEDNESDAY,
            WorkingHours.FRIDAY,
        ]
        for day in villarrica_days:
            wh, created = WorkingHours.objects.get_or_create(
                location=location_villarrica,
                day_of_week=day,
                defaults={
                    "practice": practice,
                    "start_time": datetime.time(9, 0),
                    "end_time": datetime.time(13, 0),
                    "is_active": True,
                },
            )
            if created:
                day_label = wh.get_day_of_week_display()
                self.stdout.write(
                    self.style.SUCCESS(f"  [+] Horario Villarrica {day_label}: 09:00–13:00")
                )

    # ------------------------------------------------------------------
    # Blog posts
    # ------------------------------------------------------------------

    def _seed_blog_posts(self, practice, doctor):
        from apps.content.models import BlogPost

        posts_data = [
            {
                "title": "La importancia de las vacunas en los primeros años",
                "slug": "importancia-vacunas-primeros-anos",
                "excerpt": (
                    "El calendario de vacunación es una de las herramientas más poderosas "
                    "que tenemos para proteger la salud de nuestros niños. Conocé por qué "
                    "es fundamental cumplirlo desde el nacimiento."
                ),
                "content": (
                    "<p>Las vacunas son una de las intervenciones médicas más efectivas "
                    "en la historia de la humanidad. Gracias a ellas, enfermedades que "
                    "antes causaban miles de muertes infantiles al año —como el sarampión, "
                    "la tos ferina o la poliomielitis— han sido controladas o erradicadas "
                    "en gran parte del mundo.</p>\n\n"
                    "<p>En Chile, el Programa Nacional de Inmunizaciones (PNI) establece "
                    "un calendario oficial desde el nacimiento hasta los 12 años. Cada "
                    "vacuna está programada en el momento en que el sistema inmune del "
                    "niño está listo para responder y cuando el riesgo de contraer la "
                    "enfermedad es mayor. Saltarse o retrasar una dosis puede dejar a tu "
                    "hijo o hija vulnerable justo en el período más crítico.</p>\n\n"
                    "<p>Desde la consulta, recomendamos siempre tener el carnet de "
                    "vacunas al día y consultar con la pediatra ante cualquier duda. "
                    "Existen también vacunas complementarias al calendario oficial —como "
                    "la del meningococo o la del rotavirus— que pueden ser una opción "
                    "importante según el perfil de cada niño. Hablá con nosotros en tu "
                    "próximo control.</p>"
                ),
                "tags": "vacunas,prevención,salud infantil,calendario vacunación",
                "meta_description": (
                    "Por qué el calendario de vacunación es clave en los primeros años de "
                    "vida. Guía de la Dra. Estefanía para familias de Pucón y Villarrica."
                ),
            },
            {
                "title": "Alimentación complementaria: cuándo y cómo empezar",
                "slug": "alimentacion-complementaria-cuando-como-empezar",
                "excerpt": (
                    "A los 6 meses los bebés están listos para comenzar con alimentos "
                    "sólidos. Te explicamos cómo hacer esta transición de forma segura "
                    "y con evidencia científica actual."
                ),
                "content": (
                    "<p>La introducción de alimentos sólidos es un hito emocionante "
                    "para cualquier familia, pero también genera muchas preguntas. "
                    "¿A qué edad se empieza? ¿Qué alimentos son seguros? ¿Cuánto "
                    "debe comer un bebé de 6 meses? La evidencia actual es clara: "
                    "la alimentación complementaria debe iniciarse alrededor de los "
                    "6 meses, manteniendo la lactancia materna o la fórmula como "
                    "fuente principal de nutrición durante el primer año.</p>\n\n"
                    "<p>Los primeros alimentos no deben ser papillas procesadas ni "
                    "cereales con azúcar. Lo ideal es ofrecer purés o alimentos "
                    "blandos de un solo ingrediente: zanahoria, zapallo, papa, "
                    "pollo. De esta forma podés identificar posibles alergias y "
                    "acostumbrar al bebé a diferentes sabores y texturas. El método "
                    "BLW (Baby-Led Weaning) también es una alternativa válida para "
                    "muchas familias: permite que el bebé explore los alimentos a su "
                    "ritmo con trozos apropiados para su edad.</p>\n\n"
                    "<p>Lo que sí es importante evitar: sal, azúcar, miel (antes "
                    "del año), lácteos de vaca como bebida principal, y alimentos "
                    "de alto riesgo de atragantamiento como frutos secos enteros, "
                    "uvas enteras o zanahoria cruda. Consultá siempre con tu "
                    "pediatra para adaptar las recomendaciones al desarrollo "
                    "específico de tu hijo o hija.</p>"
                ),
                "tags": "alimentación,bebés,destete,BLW,nutrición infantil",
                "meta_description": (
                    "Guía de alimentación complementaria para bebés desde los 6 meses. "
                    "Consejos prácticos de la Dra. Estefanía, pediatra en Pucón y Villarrica."
                ),
            },
            {
                "title": "Señales de alerta en el desarrollo infantil",
                "slug": "senales-alerta-desarrollo-infantil",
                "excerpt": (
                    "Cada niño se desarrolla a su propio ritmo, pero hay hitos clave "
                    "que debemos monitorear. Conocé las señales de alerta en el "
                    "desarrollo motor, del lenguaje y social."
                ),
                "content": (
                    "<p>El desarrollo infantil no es una línea recta ni tiene un "
                    "único camino correcto. Sin embargo, existen hitos que la mayoría "
                    "de los niños alcanzan dentro de ventanas de tiempo razonables. "
                    "Identificar señales de alerta a tiempo permite intervenir "
                    "precozmente, lo que hace una diferencia enorme en el pronóstico.</p>\n\n"
                    "<p>Algunas señales que merecen una consulta pediátrica sin demora: "
                    "no sostener la cabeza a los 4 meses, no sentarse sin apoyo a los "
                    "9 meses, no caminar a los 18 meses, no decir ninguna palabra a los "
                    "12 meses, no combinar dos palabras a los 24 meses, pérdida de "
                    "habilidades ya adquiridas en cualquier momento, o falta de "
                    "contacto visual y respuesta social desde los 6 meses.</p>\n\n"
                    "<p>Es importante aclarar que detectar una señal de alerta no "
                    "significa que el niño tenga un diagnóstico. Muchas veces una "
                    "evaluación tranquiliza a la familia y confirma que todo marcha "
                    "bien. Pero cuando hay algo que trabajar, empezar cuanto antes "
                    "siempre es mejor. En el consultorio ofrecemos controles de "
                    "desarrollo integrales con herramientas estandarizadas y "
                    "derivación oportuna a especialistas cuando es necesario.</p>"
                ),
                "tags": "desarrollo infantil,psicomotor,lenguaje,señales de alerta,neurología",
                "meta_description": (
                    "Señales de alerta en el desarrollo motor, del lenguaje y social en "
                    "niños. Guía de la Dra. Estefanía, pediatra en La Araucanía."
                ),
            },
        ]

        for data in posts_data:
            post, created = BlogPost.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    **data,
                    "practice": practice,
                    "author": doctor,
                    "is_published": True,
                    "published_at": timezone.now(),
                },
            )
            label = "[+] BlogPost creado" if created else "[=] BlogPost ya existe"
            self.stdout.write(self.style.SUCCESS(f"  {label}: {post.title}"))

    # ------------------------------------------------------------------
    # FAQs
    # ------------------------------------------------------------------

    def _seed_faqs(self, practice):
        from apps.content.models import FAQ

        faqs_data = [
            {
                "question": "¿A partir de qué edad atiende la Dra. Estefanía?",
                "answer": (
                    "La Dra. Estefanía atiende desde recién nacidos hasta los 15 años. "
                    "Si tu hijo o hija tiene más de 15 años, podemos orientarte hacia "
                    "un médico de medicina interna o un internista con experiencia en "
                    "adolescentes."
                ),
                "order": 1,
            },
            {
                "question": "¿Cómo puedo reservar una hora de consulta?",
                "answer": (
                    "Podés reservar tu hora directamente desde nuestra página web, "
                    "seleccionando la sede, el tipo de consulta y el horario disponible. "
                    "También podés escribirnos por email a contacto@estefipediatra.com "
                    "y te ayudamos a coordinar tu cita."
                ),
                "order": 2,
            },
            {
                "question": "¿Qué pasa si necesito cancelar mi hora?",
                "answer": (
                    "Entendemos que los imprevistos ocurren. Si cancelás con más de "
                    "24 horas de anticipación, no hay cargo. Entre 12 y 24 horas antes "
                    "se aplica un cargo del 50% del valor de la consulta. Con menos de "
                    "12 horas de anticipación o en caso de no presentarse, se cobra "
                    "el 100% del valor. Esto nos permite respetar el tiempo de otros "
                    "pacientes en lista de espera."
                ),
                "order": 3,
            },
            {
                "question": "¿Las consultas online son igual de efectivas?",
                "answer": (
                    "Las consultas online son ideales para seguimientos, orientación "
                    "ante síntomas leves, revisión de exámenes y segunda opinión. "
                    "No reemplazan la consulta presencial cuando se necesita un "
                    "examen físico completo, como en urgencias o controles de niño "
                    "sano. La Dra. Estefanía te indicará si tu caso es apropiado "
                    "para ser atendido de forma remota."
                ),
                "order": 4,
            },
            {
                "question": "¿Qué debo llevar a la consulta de control niño sano?",
                "answer": (
                    "Para el control de niño sano es importante traer: el carnet "
                    "de vacunas, el carnet de control de salud (libreta de salud "
                    "del niño), cualquier examen previo relevante, y si es posible, "
                    "una lista de las preguntas o inquietudes que querés consultar. "
                    "Esto nos permite aprovechar mejor el tiempo de la consulta."
                ),
                "order": 5,
            },
        ]

        for data in faqs_data:
            faq, created = FAQ.objects.get_or_create(
                practice=practice,
                question=data["question"],
                defaults={**data, "is_published": True},
            )
            label = "[+] FAQ creada" if created else "[=] FAQ ya existe"
            self.stdout.write(self.style.SUCCESS(f"  {label}: {faq.question[:60]}..."))

    # ------------------------------------------------------------------
    # Cancellation policy
    # ------------------------------------------------------------------

    def _seed_cancellation_policy(self, practice):
        from apps.scheduling.models import CancellationPolicy, CancellationTier

        policy, created = CancellationPolicy.objects.get_or_create(
            practice=practice,
            defaults={
                "is_active": True,
                "description": (
                    "Política de cancelación del consultorio. Las cancelaciones con "
                    "suficiente anticipación permiten ofrecer el horario a pacientes "
                    "en lista de espera."
                ),
            },
        )
        label = "[+] CancellationPolicy creada" if created else "[=] CancellationPolicy ya existe"
        self.stdout.write(self.style.SUCCESS(f"  {label}"))

        tiers_data = [
            {
                "min_hours_before": 24,
                "penalty_percentage": Decimal("0.00"),
                "description": "Más de 24 horas de anticipación — sin cargo",
            },
            {
                "min_hours_before": 12,
                "penalty_percentage": Decimal("50.00"),
                "description": "Entre 12 y 24 horas de anticipación — 50% de cargo",
            },
            {
                "min_hours_before": 0,
                "penalty_percentage": Decimal("100.00"),
                "description": "Menos de 12 horas o no presentarse — 100% de cargo",
            },
        ]

        for data in tiers_data:
            tier, created = CancellationTier.objects.get_or_create(
                policy=policy,
                min_hours_before=data["min_hours_before"],
                defaults=data,
            )
            label = "[+] Tier creado" if created else "[=] Tier ya existe"
            self.stdout.write(self.style.SUCCESS(f"  {label}: {tier.description}"))

    # ------------------------------------------------------------------
    # Auto responder
    # ------------------------------------------------------------------

    def _seed_auto_responder(self, practice):
        from apps.scheduling.models import AutoResponderConfig

        config, created = AutoResponderConfig.objects.get_or_create(
            practice=practice,
            defaults={
                "is_active": True,
                "outside_hours_message": (
                    "Hola, gracias por contactarte con el consultorio de la "
                    "Dra. Estefanía. En este momento estamos fuera de nuestro "
                    "horario de atención. Podés reservar tu hora directamente "
                    "desde nuestra web en estefipediatra.com. Si es una urgencia "
                    "pediátrica, dirigite al Servicio de Urgencia más cercano. "
                    "Te responderemos en el próximo horario hábil. ¡Gracias!"
                ),
                "holiday_message": (
                    "Hola, el consultorio de la Dra. Estefanía se encuentra "
                    "cerrado por feriado o vacaciones. Podés reservar tu hora "
                    "para cuando retomemos la atención desde estefipediatra.com. "
                    "Para urgencias, dirigite al Servicio de Urgencia Pediátrica. "
                    "¡Que tengas excelentes fiestas!"
                ),
            },
        )
        label = "[+] AutoResponder creado" if created else "[=] AutoResponder ya existe"
        self.stdout.write(self.style.SUCCESS(f"  {label}"))

    # ------------------------------------------------------------------
    # Demo tutor + patients
    # ------------------------------------------------------------------

    def _seed_tutor_and_patients(self, practice):
        from apps.patients.models import Patient, TutorPatient
        from apps.users.models import User

        # Tutor user
        tutor, created = User.objects.get_or_create(
            email="tutor@demo.com",
            defaults={
                "first_name": "Carolina",
                "last_name": "Soto",
                "phone": "+56 9 1234 5678",
                "role": User.TUTOR,
                "is_active": True,
                "email_verified_at": timezone.now(),
            },
        )
        if created:
            tutor.set_password("PediaCore2024!")
            tutor.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS("  [+] Tutor creado: tutor@demo.com"))
        else:
            self.stdout.write("  [=] Tutor ya existe: tutor@demo.com")

        # Patient 1 — 3 years old girl
        patient1, created = Patient.objects.get_or_create(
            practice=practice,
            rut="12345678-9",
            defaults={
                "first_name": "Sofía",
                "last_name": "Soto",
                "date_of_birth": datetime.date(2022, 8, 15),
                "sex_at_birth": Patient.F,
                "blood_type": Patient.O_POS,
                "allergies": "",
                "chronic_conditions": "",
                "notes": "Paciente de demo para pruebas del sistema.",
                "is_active": True,
            },
        )
        label = "[+] Paciente creada" if created else "[=] Paciente ya existe"
        self.stdout.write(self.style.SUCCESS(f"  {label}: {patient1.full_name}"))

        TutorPatient.objects.get_or_create(
            tutor=tutor,
            patient=patient1,
            defaults={
                "practice": practice,
                "relationship": TutorPatient.MOTHER,
                "is_primary": True,
            },
        )

        # Patient 2 — 1 year old boy
        patient2, created = Patient.objects.get_or_create(
            practice=practice,
            rut="98765432-1",
            defaults={
                "first_name": "Mateo",
                "last_name": "Soto",
                "date_of_birth": datetime.date(2024, 3, 20),
                "sex_at_birth": Patient.M,
                "blood_type": Patient.A_POS,
                "allergies": "",
                "chronic_conditions": "",
                "notes": "Hermano menor. Paciente de demo.",
                "is_active": True,
            },
        )
        label = "[+] Paciente creado" if created else "[=] Paciente ya existe"
        self.stdout.write(self.style.SUCCESS(f"  {label}: {patient2.full_name}"))

        TutorPatient.objects.get_or_create(
            tutor=tutor,
            patient=patient2,
            defaults={
                "practice": practice,
                "relationship": TutorPatient.MOTHER,
                "is_primary": True,
            },
        )
