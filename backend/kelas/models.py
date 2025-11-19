from django.db import models
from django.conf import settings

class Kelas(models.Model):
    kelas_id = models.AutoField(primary_key=True)
    nama_kelas = models.CharField(max_length=255)
    prodi = models.CharField(max_length=255)
    jadwal = models.CharField(max_length=255)
    status = models.CharField(max_length=255)
    dosen_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='kelas_dosen')

    def __str__(self):
        return self.nama_kelas

class Sesi(models.Model):
    sesi_id = models.AutoField(primary_key=True)
    kelas_id = models.ForeignKey(Kelas, on_delete=models.CASCADE)
    dosen_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tanggal = models.DateTimeField()
    topik = models.CharField(max_length=255)
    mode = models.CharField(max_length=50) # online/offline
    status = models.CharField(max_length=50) # aktif/selesai

    def __str__(self):
        return f"Sesi {self.sesi_id} - {self.topik}"