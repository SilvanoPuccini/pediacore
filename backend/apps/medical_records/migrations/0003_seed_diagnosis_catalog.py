"""
Data migration: seed DiagnosisCatalog with ~50 common pediatric ICD-10 codes.
"""

from django.db import migrations


CATALOG_DATA = [
    # Respiratory
    {"code": "J06.9", "name": "Upper respiratory infection, unspecified", "name_es": "Infección respiratoria alta, no especificada", "category": "respiratory"},
    {"code": "J20.9", "name": "Acute bronchitis, unspecified", "name_es": "Bronquitis aguda, no especificada", "category": "respiratory"},
    {"code": "J45.0", "name": "Predominantly allergic asthma", "name_es": "Asma predominantemente alérgica", "category": "respiratory"},
    {"code": "J03.9", "name": "Acute tonsillitis, unspecified", "name_es": "Amigdalitis aguda, no especificada", "category": "respiratory"},
    {"code": "J02.9", "name": "Acute pharyngitis, unspecified", "name_es": "Faringitis aguda, no especificada", "category": "respiratory"},
    {"code": "J01.9", "name": "Acute sinusitis, unspecified", "name_es": "Sinusitis aguda, no especificada", "category": "respiratory"},
    {"code": "J04.0", "name": "Acute laryngitis", "name_es": "Laringitis aguda", "category": "respiratory"},
    {"code": "J21.9", "name": "Acute bronchiolitis, unspecified", "name_es": "Bronquiolitis aguda, no especificada", "category": "respiratory"},
    {"code": "J18.9", "name": "Pneumonia, unspecified", "name_es": "Neumonía, no especificada", "category": "respiratory"},
    {"code": "J30.1", "name": "Allergic rhinitis due to pollen", "name_es": "Rinitis alérgica debida al polen", "category": "respiratory"},
    # Gastrointestinal
    {"code": "A09", "name": "Infectious gastroenteritis and colitis", "name_es": "Gastroenteritis y colitis infecciosa", "category": "gastrointestinal"},
    {"code": "K21.0", "name": "Gastro-esophageal reflux with esophagitis", "name_es": "Reflujo gastroesofágico con esofagitis", "category": "gastrointestinal"},
    {"code": "K59.0", "name": "Constipation", "name_es": "Constipación", "category": "gastrointestinal"},
    {"code": "R11", "name": "Nausea and vomiting", "name_es": "Náuseas y vómitos", "category": "gastrointestinal"},
    {"code": "K52.9", "name": "Non-infective gastroenteritis and colitis, unspecified", "name_es": "Gastroenteritis y colitis no infecciosa, no especificada", "category": "gastrointestinal"},
    # Dermatological
    {"code": "L20.9", "name": "Atopic dermatitis, unspecified", "name_es": "Dermatitis atópica, no especificada", "category": "dermatological"},
    {"code": "L30.9", "name": "Dermatitis, unspecified", "name_es": "Dermatitis, no especificada", "category": "dermatological"},
    {"code": "B08.1", "name": "Molluscum contagiosum", "name_es": "Molusco contagioso", "category": "dermatological"},
    {"code": "L01.0", "name": "Impetigo", "name_es": "Impétigo", "category": "dermatological"},
    {"code": "B07", "name": "Viral warts", "name_es": "Verrugas virales", "category": "dermatological"},
    # Ear / Eye
    {"code": "H66.9", "name": "Otitis media, unspecified", "name_es": "Otitis media, no especificada", "category": "ear_eye"},
    {"code": "H65.9", "name": "Non-suppurative otitis media, unspecified", "name_es": "Otitis media no supurativa, no especificada", "category": "ear_eye"},
    {"code": "H10.9", "name": "Conjunctivitis, unspecified", "name_es": "Conjuntivitis, no especificada", "category": "ear_eye"},
    # Infectious
    {"code": "B34.9", "name": "Viral infection, unspecified", "name_es": "Infección viral, no especificada", "category": "infectious"},
    {"code": "B01.9", "name": "Varicella without complication", "name_es": "Varicela sin complicaciones", "category": "infectious"},
    {"code": "A08.0", "name": "Rotavirus enteritis", "name_es": "Enteritis por rotavirus", "category": "infectious"},
    {"code": "B27.9", "name": "Infectious mononucleosis, unspecified", "name_es": "Mononucleosis infecciosa, no especificada", "category": "infectious"},
    {"code": "B05.9", "name": "Measles without complication", "name_es": "Sarampión sin complicaciones", "category": "infectious"},
    # Allergic / Immunological
    {"code": "L50.0", "name": "Allergic urticaria", "name_es": "Urticaria alérgica", "category": "allergic"},
    {"code": "T78.4", "name": "Allergy, unspecified", "name_es": "Alergia, no especificada", "category": "allergic"},
    {"code": "J45.9", "name": "Asthma, unspecified", "name_es": "Asma, no especificada", "category": "allergic"},
    # Musculoskeletal / Trauma
    {"code": "M79.3", "name": "Panniculitis, unspecified", "name_es": "Paniculitis, no especificada", "category": "musculoskeletal"},
    {"code": "S00.9", "name": "Superficial injury of head, unspecified", "name_es": "Traumatismo superficial de cabeza, no especificado", "category": "musculoskeletal"},
    {"code": "S60.9", "name": "Superficial injury of wrist and hand, unspecified", "name_es": "Traumatismo superficial de muñeca y mano, no especificado", "category": "musculoskeletal"},
    # Nutritional / Growth
    {"code": "E46", "name": "Unspecified protein-calorie malnutrition", "name_es": "Desnutrición proteico-calórica, no especificada", "category": "nutritional"},
    {"code": "E66.0", "name": "Obesity due to excess calories", "name_es": "Obesidad por exceso de calorías", "category": "nutritional"},
    {"code": "E55.9", "name": "Vitamin D deficiency, unspecified", "name_es": "Deficiencia de vitamina D, no especificada", "category": "nutritional"},
    {"code": "D50.9", "name": "Iron deficiency anaemia, unspecified", "name_es": "Anemia por deficiencia de hierro, no especificada", "category": "nutritional"},
    # Well-child / Preventive
    {"code": "Z00.1", "name": "Routine child health examination", "name_es": "Control de salud infantil de rutina", "category": "preventive"},
    {"code": "Z23", "name": "Encounter for immunization", "name_es": "Consulta para vacunación", "category": "preventive"},
    {"code": "Z00.0", "name": "General medical examination", "name_es": "Examen médico general", "category": "preventive"},
    # Urinary
    {"code": "N39.0", "name": "Urinary tract infection, site not specified", "name_es": "Infección urinaria, sitio no especificado", "category": "urinary"},
    {"code": "N10", "name": "Acute tubulo-interstitial nephritis", "name_es": "Nefritis tubulointersticial aguda", "category": "urinary"},
    # Neurological
    {"code": "G43.9", "name": "Migraine, unspecified", "name_es": "Migraña, no especificada", "category": "neurological"},
    {"code": "R56.0", "name": "Febrile convulsions", "name_es": "Convulsiones febriles", "category": "neurological"},
    {"code": "G40.9", "name": "Epilepsy, unspecified", "name_es": "Epilepsia, no especificada", "category": "neurological"},
    # Behavioral / Developmental
    {"code": "F90.0", "name": "Attention-deficit hyperactivity disorder, predominantly inattentive", "name_es": "Trastorno por déficit de atención e hiperactividad (TDAH)", "category": "behavioral"},
    {"code": "F80.9", "name": "Developmental disorder of speech and language, unspecified", "name_es": "Trastorno del desarrollo del habla y lenguaje, no especificado", "category": "behavioral"},
    {"code": "F84.0", "name": "Childhood autism", "name_es": "Autismo infantil", "category": "behavioral"},
    {"code": "R62.0", "name": "Delayed milestone in childhood", "name_es": "Retraso en el desarrollo psicomotor", "category": "behavioral"},
    # Other common
    {"code": "R50.9", "name": "Fever, unspecified", "name_es": "Fiebre, no especificada", "category": "other"},
    {"code": "R05", "name": "Cough", "name_es": "Tos", "category": "other"},
    {"code": "R10.4", "name": "Other and unspecified abdominal pain", "name_es": "Dolor abdominal, no especificado", "category": "other"},
]


def seed_diagnosis_catalog(apps, schema_editor):
    DiagnosisCatalog = apps.get_model("medical_records", "DiagnosisCatalog")
    entries = [
        DiagnosisCatalog(
            code=entry["code"],
            name=entry["name"],
            name_es=entry["name_es"],
            category=entry["category"],
            is_common=True,
        )
        for entry in CATALOG_DATA
    ]
    DiagnosisCatalog.objects.bulk_create(entries, ignore_conflicts=True)


def unseed_diagnosis_catalog(apps, schema_editor):
    DiagnosisCatalog = apps.get_model("medical_records", "DiagnosisCatalog")
    codes = [entry["code"] for entry in CATALOG_DATA]
    DiagnosisCatalog.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("medical_records", "0002_diagnosiscatalog"),
    ]

    operations = [
        migrations.RunPython(seed_diagnosis_catalog, reverse_code=unseed_diagnosis_catalog),
    ]
