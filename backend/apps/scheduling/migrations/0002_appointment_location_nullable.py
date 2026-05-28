from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("practice", "0001_initial"),
        ("scheduling", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appointment",
            name="location",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="appointments",
                to="practice.location",
                verbose_name="location",
            ),
        ),
    ]
