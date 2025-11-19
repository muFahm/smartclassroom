from django.db import models
from django.conf import settings
from kelas.models import Sesi

class ObjectCounting(models.Model):
    object_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    jumlah_kursi = models.IntegerField()
    kursi_terisi = models.IntegerField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"Object {self.object_id}"


class EmotionRecognition(models.Model):
    emotion_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    emotion_label = models.CharField(max_length=255)
    confidence = models.FloatField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"Emotion {self.emotion_label}"


class GestureRecognition(models.Model):
    gesture_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    gesture_label = models.CharField(max_length=255)
    confidence = models.FloatField()
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"Gesture {self.gesture_label}"


class ActivityMonitoring(models.Model):
    monitoring_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    aktivitas = models.CharField(max_length=255)
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"Activity {self.monitoring_id}"


class SpeechTranscript(models.Model):
    transcript_id = models.AutoField(primary_key=True)
    sesi_id = models.ForeignKey(Sesi, on_delete=models.CASCADE)
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField()
    emotion_label = models.CharField(max_length=255)
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"Transcript {self.transcript_id}"
