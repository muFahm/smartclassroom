from django.db import models
from kelas.models import Sesi

class SensorData(models.Model):
    sensor_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    suhu = models.FloatField()
    cahaya = models.FloatField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"Sensor {self.sensor_id}"


class DeviceStatus(models.Model):
    device_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    device_name = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    last_update = models.DateTimeField()

    def __str__(self):
        return f"Device {self.device_name}"
