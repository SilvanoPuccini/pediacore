# Generated migration for NotificationTemplate model.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0002_register_q2_schedules"),
        ("practice", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="deleted at"),
                ),
                ("name", models.CharField(max_length=200, verbose_name="name")),
                ("subject", models.CharField(max_length=300, verbose_name="subject")),
                (
                    "body",
                    models.TextField(
                        help_text="Use {{paciente}}, {{tutor}}, {{fecha}} as variables.",
                        verbose_name="body",
                    ),
                ),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("REMINDER", "Recordatorio"),
                            ("RESULT", "Resultado disponible"),
                            ("BIRTHDAY", "Cumpleaños"),
                            ("VACCINATION", "Vacuna pendiente"),
                            ("FOLLOW_UP", "Seguimiento"),
                            ("PAYMENT", "Pago"),
                            ("CUSTOM", "Personalizado"),
                        ],
                        default="CUSTOM",
                        max_length=20,
                        verbose_name="event type",
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="active")),
                (
                    "practice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notification_templates",
                        to="practice.practice",
                        verbose_name="practice",
                    ),
                ),
            ],
            options={
                "verbose_name": "notification template",
                "verbose_name_plural": "notification templates",
                "db_table": "notification_templates",
                "ordering": ["event_type", "name"],
            },
        ),
    ]
