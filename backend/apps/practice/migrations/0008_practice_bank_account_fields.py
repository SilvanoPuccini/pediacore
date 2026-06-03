from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("practice", "0007_add_service_to_workinghours"),
    ]

    operations = [
        migrations.AddField(
            model_name="practice",
            name="bank_name",
            field=models.CharField(blank=True, default="", max_length=100, verbose_name="bank name"),
        ),
        migrations.AddField(
            model_name="practice",
            name="account_type",
            field=models.CharField(blank=True, default="", max_length=50, verbose_name="account type"),
        ),
        migrations.AddField(
            model_name="practice",
            name="account_number",
            field=models.CharField(blank=True, default="", max_length=50, verbose_name="account number"),
        ),
        migrations.AddField(
            model_name="practice",
            name="account_holder",
            field=models.CharField(blank=True, default="", max_length=150, verbose_name="account holder"),
        ),
        migrations.AddField(
            model_name="practice",
            name="account_rut",
            field=models.CharField(blank=True, default="", max_length=20, verbose_name="account RUT"),
        ),
        migrations.AddField(
            model_name="practice",
            name="account_email",
            field=models.EmailField(blank=True, default="", max_length=254, verbose_name="account email"),
        ),
    ]
