from django.db import models
from django.conf import settings
from kelas.models import Sesi

class Polling(models.Model):
    polling_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    dosen_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pertanyaan = models.TextField()
    waktu_mulai = models.DateTimeField()
    waktu_selesai = models.DateTimeField()

    def __str__(self):
        return f"Polling {self.polling_id}"


class PollingJawaban(models.Model):
    jawaban_id = models.AutoField(primary_key=True)
    polling_id = models.ForeignKey(Polling, on_delete=models.CASCADE)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pilihan = models.CharField(max_length=10)
    benar = models.BooleanField()
    waktu_kirim = models.DateTimeField()

    def __str__(self):
        return f"Jawaban {self.jawaban_id}"
