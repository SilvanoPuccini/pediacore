"""
Seed initial practice data: Practice + Locations.

Idempotent — safe to run multiple times.
Creates a default owner user only if no staff user exists.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.practice.models import Location, Practice

DEFAULT_OWNER_EMAIL = "estefiortigosa.peditra@gmail.com"
DEFAULT_OWNER_PASSWORD = "admin123"  # nosec — dev seed only

PRACTICE_DEFAULTS = {
    "name": "Dra. Estefanía",
    "description": (
        "Pediatría con tiempo, calidez y atención personalizada "
        "en Pucón y Villarrica."
    ),
    "email": DEFAULT_OWNER_EMAIL,
    "phone": "+56 9 5845 5537",
    "website": "https://estefipediatra.com",
}

LOCATIONS = [
    {
        "name": "Centro Clínico Terapéutico El Valle Pucón",
        "slug": "pucon",
        "address": "Gral. Urrutia 291, 4920000 Pucón",
        "city": "Pucón",
        "region": "Araucanía",
        "phone": "+56 9 5845 5537",
        "email": "estefiortigosa.peditra@gmail.com",
        "display_hours": "Lun 10–17 · Mié 10–15 · Jue 11–18",
    },
    {
        "name": "Centro Materno Pediátrico Almainfancia Villarrica",
        "slug": "villarrica",
        "address": "Valentin Letelier 921, 4930000 Villarrica",
        "city": "Villarrica",
        "region": "Araucanía",
        "phone": "+56 9 5845 5537",
        "email": "estefiortigosa.peditra@gmail.com",
        "display_hours": "Mar 10–17 · Vie 10–17",
    },
]


class Command(BaseCommand):
    """Seed Practice + Locations for estefipediatra.com."""

    help = "Seed initial practice and location data."

    def handle(self, **_options):
        User = get_user_model()

        # Resolve owner — use existing staff or create default
        owner = User.objects.filter(is_staff=True).first()
        if owner:
            self.stdout.write(f"  Using existing owner: {owner.email}")
        else:
            owner = User.objects.create_user(
                email=DEFAULT_OWNER_EMAIL,
                password=DEFAULT_OWNER_PASSWORD,
                is_staff=True,
                is_superuser=True,
            )
            self.stdout.write(f"  Created default owner: {owner.email}")

        # Practice
        practice, created = Practice.objects.get_or_create(
            slug="dra-estefi",
            defaults={**PRACTICE_DEFAULTS, "owner": owner},
        )
        if created:
            self.stdout.write(f"  Created practice: {practice.name}")
        else:
            self.stdout.write(f"  Practice already exists: {practice.name}")
            # Update fields in case they changed
            for key in ["name", "description", "email", "phone", "website"]:
                setattr(practice, key, PRACTICE_DEFAULTS[key])
            practice.save()

        # Locations
        for data in LOCATIONS:
            loc, created = Location.objects.get_or_create(
                practice=practice,
                slug=data["slug"],
                defaults=data,
            )
            if created:
                self.stdout.write(f"  Created location: {loc.name}")
            else:
                self.stdout.write(f"  Location already exists: {loc.name}")
                # Update fields in case they changed
                for key, val in data.items():
                    setattr(loc, key, val)
                loc.save()

        self.stdout.write(self.style.SUCCESS("Seed complete ✓"))
