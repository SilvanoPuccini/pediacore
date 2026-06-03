from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="receipt_file",
            field=models.FileField(blank=True, upload_to="transfer_receipts/", verbose_name="receipt file"),
        ),
        migrations.AddField(
            model_name="payment",
            name="receipt_uploaded_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="receipt uploaded at"),
        ),
        migrations.AddField(
            model_name="payment",
            name="transfer_expires_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="transfer expires at"),
        ),
    ]
