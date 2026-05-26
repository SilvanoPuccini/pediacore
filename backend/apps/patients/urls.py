"""
URL configuration for the patients app.

Produces:
  patients/                                  PatientViewSet
  patients/<patient_pk>/tutors/              TutorPatientViewSet
  patients/<patient_pk>/tutors/<pk>/         TutorPatientViewSet detail
  patients/<patient_pk>/files/               PatientFileViewSet
  patients/<patient_pk>/files/<pk>/          PatientFileViewSet detail
"""

from django.urls import path

from apps.patients.views import PatientFileViewSet, PatientViewSet, TutorPatientViewSet

app_name = "patients"

patient_list = PatientViewSet.as_view({"get": "list", "post": "create"})
patient_detail = PatientViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)

tutor_list = TutorPatientViewSet.as_view({"get": "list", "post": "create"})
tutor_detail = TutorPatientViewSet.as_view({"get": "retrieve", "delete": "destroy"})

file_list = PatientFileViewSet.as_view({"get": "list", "post": "create"})
file_detail = PatientFileViewSet.as_view({"get": "retrieve", "delete": "destroy"})

urlpatterns = [
    path("patients/", patient_list, name="patient-list"),
    path("patients/<int:pk>/", patient_detail, name="patient-detail"),
    path("patients/<int:patient_pk>/tutors/", tutor_list, name="patient-tutor-list"),
    path("patients/<int:patient_pk>/tutors/<int:pk>/", tutor_detail, name="patient-tutor-detail"),
    path("patients/<int:patient_pk>/files/", file_list, name="patient-file-list"),
    path("patients/<int:patient_pk>/files/<int:pk>/", file_detail, name="patient-file-detail"),
]
