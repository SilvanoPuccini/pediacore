"""
Migration: Add HOLD/EXPIRED states and new fields to Appointment.

Adds hold_expires_at, meeting_link, attendance tracking, reminder flags,
and rescheduling support. All fields are nullable/default-safe (additive only).
"""

import django.db.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0002_appointment_location_nullable"),
    ]

    operations = [
        # Update status choices (handled by Django at model level, but we
        # increase max_length to accommodate RESCHEDULED)
        migrations.AlterField(
            model_name="appointment",
            name="status",
            field=models.CharField(
                choices=[
                    ("HOLD", "Hold (pending payment)"),
                    ("PENDING", "Pending"),
                    ("CONFIRMED", "Confirmed"),
                    ("COMPLETED", "Completed"),
                    ("CANCELLED", "Cancelled"),
                    ("EXPIRED", "Expired"),
                    ("NO_SHOW", "No Show"),
                    ("RESCHEDULED", "Rescheduled"),
                ],
                default="PENDING",
                max_length=20,
                verbose_name="status",
            ),
        ),
        # Hold / payment flow
        migrations.AddField(
            model_name="appointment",
            name="hold_expires_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When the HOLD reservation expires if payment is not completed.",
                null=True,
                verbose_name="hold expires at",
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="meeting_link",
            field=models.URLField(
                blank=True,
                help_text="Video call link for online appointments.",
                verbose_name="meeting link",
            ),
        ),
        # Attendance confirmation
        migrations.AddField(
            model_name="appointment",
            name="attendance_confirmed",
            field=models.BooleanField(
                default=False, verbose_name="attendance confirmed"
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="attendance_confirmed_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="attendance confirmed at"
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="attendance_confirmed_via",
            field=models.CharField(
                blank=True,
                choices=[
                    ("EMAIL", "Email"),
                    ("WHATSAPP", "WhatsApp"),
                    ("PORTAL", "Portal"),
                ],
                max_length=20,
                verbose_name="confirmed via",
            ),
        ),
        # Reminders
        migrations.AddField(
            model_name="appointment",
            name="reminder_24h_sent",
            field=models.BooleanField(
                default=False, verbose_name="24h reminder sent"
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="reminder_2h_sent",
            field=models.BooleanField(
                default=False, verbose_name="2h reminder sent"
            ),
        ),
        # Rescheduling
        migrations.AddField(
            model_name="appointment",
            name="rescheduled_from",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reschedules",
                to="scheduling.appointment",
                verbose_name="rescheduled from",
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="rescheduled_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="rescheduled at"
            ),
        ),
    ]
