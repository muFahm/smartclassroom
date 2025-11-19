from django.db import models
from django.conf import settings
from kelas.models import Sesi

class Absensi(models.Model):
    absensi_id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    waktu_absen = models.DateTimeField()
    status_kehadiran = models.CharField(max_length=50)
    metode = models.CharField(max_length=50)

    def __str__(self):
        return f"Absensi {self.face_id}"

class FaceRecognition(models.Model):
    face_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    confidence = models.FloatField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"FaceRec {self.face_id}"