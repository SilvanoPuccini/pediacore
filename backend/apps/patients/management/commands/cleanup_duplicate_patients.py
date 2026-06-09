"""
Management command to detect and optionally merge duplicate patients.

Duplicates are identified by:
  1. Same first_name + last_name + date_of_birth (case-insensitive)
  2. Same RUT (non-empty)

Usage:
  python manage.py cleanup_duplicate_patients          # dry-run (default)
  python manage.py cleanup_duplicate_patients --merge   # actually merge
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q


class Command(BaseCommand):
    help = "Detect and merge duplicate patient records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--merge",
            action="store_true",
            default=False,
            help="Actually merge duplicates (default is dry-run).",
        )

    def handle(self, *args, **options):
        from apps.medical_records.models import Encounter
        from apps.patients.models import Patient, PatientFile, TutorPatient
        from apps.scheduling.models import Appointment

        merge = options["merge"]
        mode = "MERGE" if merge else "DRY-RUN"
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  Duplicate Patient Cleanup — {mode}")
        self.stdout.write(f"{'='*60}\n")

        # --- Strategy 1: Same name + DOB ---
        name_dob_dupes = (
            Patient.objects.filter(is_active=True)
            .values("first_name", "last_name", "date_of_birth")
            .annotate(cnt=Count("id"))
            .filter(cnt__gt=1)
        )

        groups = []
        for entry in name_dob_dupes:
            patients = list(
                Patient.objects.filter(
                    is_active=True,
                    first_name__iexact=entry["first_name"],
                    last_name__iexact=entry["last_name"],
                    date_of_birth=entry["date_of_birth"],
                ).order_by("created_at")
            )
            if len(patients) > 1:
                groups.append(("name+dob", patients))

        # --- Strategy 2: Same RUT ---
        rut_dupes = (
            Patient.objects.filter(is_active=True)
            .exclude(Q(rut="") | Q(rut__isnull=True))
            .values("rut")
            .annotate(cnt=Count("id"))
            .filter(cnt__gt=1)
        )

        seen_ids = {p.id for _, ps in groups for p in ps}
        for entry in rut_dupes:
            patients = list(
                Patient.objects.filter(is_active=True, rut=entry["rut"]).order_by(
                    "created_at"
                )
            )
            if len(patients) > 1:
                new_ids = {p.id for p in patients}
                if not new_ids.issubset(seen_ids):
                    groups.append(("rut", patients))
                    seen_ids.update(new_ids)

        if not groups:
            self.stdout.write(self.style.SUCCESS("No duplicates found."))
            return

        total_merged = 0
        for reason, patients in groups:
            primary = patients[0]
            duplicates = patients[1:]
            self.stdout.write(
                f"\nGroup ({reason}): {primary.first_name} {primary.last_name} "
                f"(DOB: {primary.date_of_birth})"
            )
            self.stdout.write(f"  Primary: #{primary.id} (created {primary.created_at})")
            for dup in duplicates:
                self.stdout.write(f"  Duplicate: #{dup.id} (created {dup.created_at})")

            if merge:
                for dup in duplicates:
                    # Move tutor links
                    for tp in TutorPatient.objects.filter(patient=dup):
                        existing = TutorPatient.objects.filter(
                            patient=primary, tutor=tp.tutor
                        ).exists()
                        if not existing:
                            tp.patient = primary
                            tp.save(update_fields=["patient"])
                        else:
                            tp.delete()

                    # Move appointments
                    Appointment.objects.filter(patient=dup).update(patient=primary)

                    # Move encounters
                    Encounter.objects.filter(patient=dup).update(patient=primary)

                    # Move files
                    PatientFile.objects.filter(patient=dup).update(patient=primary)

                    # Soft-delete the duplicate
                    dup.is_active = False
                    dup.save(update_fields=["is_active"])
                    self.stdout.write(
                        self.style.WARNING(f"  → Merged #{dup.id} into #{primary.id}")
                    )
                    total_merged += 1

        self.stdout.write(f"\n{'='*60}")
        if merge:
            self.stdout.write(
                self.style.SUCCESS(f"Done. Merged {total_merged} duplicate(s).")
            )
        else:
            self.stdout.write(
                f"Found {len(groups)} duplicate group(s). "
                f"Run with --merge to fix."
            )
        self.stdout.write(f"{'='*60}\n")
