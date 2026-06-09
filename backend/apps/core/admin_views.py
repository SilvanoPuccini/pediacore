"""Custom admin views for PEDIACORE."""

from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import get_object_or_404, render


@staff_member_required
def patient_growth_chart(request, patient_id):
    """Show growth chart data for a patient in the admin."""
    from apps.medical_records.models import Anthropometry
    from apps.patients.models import Patient

    patient = get_object_or_404(Patient, pk=patient_id)

    measurements = list(
        Anthropometry.objects.filter(patient=patient)
        .select_related("encounter")
        .order_by("encounter__scheduled_at")
    )

    # Calculate age in months for each measurement
    for m in measurements:
        if patient.date_of_birth and m.encounter.scheduled_at:
            delta = m.encounter.scheduled_at.date() - patient.date_of_birth
            m.age_months = int(delta.days / 30.44)
        else:
            m.age_months = None

    return render(
        request,
        "admin/patients/growth_chart.html",
        {"patient": patient, "measurements": measurements},
    )
