from django.db import migrations, models


class Migration(migrations.Migration):

	dependencies = [
		("quiz_sessions", "0001_initial"),
	]

	operations = [
		migrations.AddField(
			model_name="pollingdevice",
			name="claim_code",
			field=models.CharField(blank=True, default="", max_length=12),
		),
		migrations.AddField(
			model_name="pollingdevice",
			name="last_payload",
			field=models.JSONField(blank=True, default=dict),
		),
		migrations.AddField(
			model_name="pollingdevice",
			name="last_rssi",
			field=models.IntegerField(blank=True, null=True),
		),
	]