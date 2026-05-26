"""
URL configuration for the medical_records app.

Encounter endpoints are at the root level.
SOAP note, physical exam, vital signs, anthropometry, and diagnoses
are nested under /encounters/<encounter_pk>/.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.medical_records.views import (
    AnthropometryViewSet,
    DiagnosisViewSet,
    EncounterViewSet,
    PhysicalExamViewSet,
    SOAPNoteViewSet,
    VitalSignsViewSet,
)

app_name = "medical_records"

router = DefaultRouter()
router.register(r"encounters", EncounterViewSet, basename="encounter")

# Nested routers under encounter
nested_soap_router = DefaultRouter()
nested_soap_router.register(r"soap", SOAPNoteViewSet, basename="soap-note")

nested_exam_router = DefaultRouter()
nested_exam_router.register(r"physical-exam", PhysicalExamViewSet, basename="physical-exam")

nested_vitals_router = DefaultRouter()
nested_vitals_router.register(r"vital-signs", VitalSignsViewSet, basename="vital-signs")

nested_anthropometry_router = DefaultRouter()
nested_anthropometry_router.register(r"anthropometry", AnthropometryViewSet, basename="anthropometry")

nested_diagnoses_router = DefaultRouter()
nested_diagnoses_router.register(r"diagnoses", DiagnosisViewSet, basename="diagnosis")

urlpatterns = [
    path("", include(router.urls)),
    # Nested resources under a specific encounter
    path(
        "encounters/<int:encounter_pk>/",
        include(
            [
                path("", include(nested_soap_router.urls)),
                path("", include(nested_exam_router.urls)),
                path("", include(nested_vitals_router.urls)),
                path("", include(nested_anthropometry_router.urls)),
                path("", include(nested_diagnoses_router.urls)),
            ]
        ),
    ),
]
