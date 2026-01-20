from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="avatar_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="enrollment_year",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="full_name",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="customuser",
            name="major",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="customuser",
            name="nim",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.CreateModel(
            name="UserActivityLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("activity_type", models.CharField(choices=[('login', 'Login/Logout'), ('device', 'Device'), ('session', 'Session'), ('profile', 'Profile'), ('other', 'Other')], default='other', max_length=20)),
                ("message", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="activity_logs", to="accounts.customuser")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
