from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


def _face_sample_upload_to(instance, filename: str) -> str:
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    prompt = getattr(instance, "prompt_type", "unknown")
    return f"biometrics/faces/user_{instance.user_id}/{prompt}/{ts}_{filename}"


def _voice_sample_upload_to(instance, filename: str) -> str:
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"biometrics/voices/user_{instance.user_id}/{ts}_{filename}"


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    ROLE_CHOICES = (
        ("student", "Mahasiswa"),
        ("lecturer", "Dosen/Admin"),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self) -> str:
        return f"{self.email} ({self.role})"


class FaceEnrollment(models.Model):
    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="face_enrollments",
    )
    model_name = models.CharField(max_length=100, default="arcface")
    model_version = models.CharField(max_length=100, default="v1")
    embedding = models.JSONField(default=list, blank=True)
    quality_score = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["user", "is_active"])]


class FaceSample(models.Model):
    PROMPT_NEUTRAL = "neutral"
    PROMPT_EYES_CLOSED = "eyes_closed"
    PROMPT_MOUTH_OPEN = "mouth_open"
    PROMPT_CHOICES = [
        (PROMPT_NEUTRAL, "Neutral"),
        (PROMPT_EYES_CLOSED, "Eyes closed"),
        (PROMPT_MOUTH_OPEN, "Mouth open"),
    ]

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="face_samples",
    )
    enrollment = models.ForeignKey(
        "accounts.FaceEnrollment",
        on_delete=models.CASCADE,
        related_name="samples",
        null=True,
        blank=True,
    )
    prompt_type = models.CharField(max_length=20, choices=PROMPT_CHOICES, default=PROMPT_NEUTRAL)
    image = models.ImageField(upload_to=_face_sample_upload_to)
    embedding = models.JSONField(default=list, blank=True)
    detector_confidence = models.FloatField(null=True, blank=True)
    blur_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class VoiceEnrollment(models.Model):
    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="voice_enrollments",
    )
    model_name = models.CharField(max_length=100, default="ecapa-tdnn")
    model_version = models.CharField(max_length=200, default="speechbrain/spkrec-ecapa-voxceleb")
    embedding = models.JSONField(default=list, blank=True)
    quality_score = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["user", "is_active"])]


class VoiceSample(models.Model):
    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="voice_samples",
    )
    enrollment = models.ForeignKey(
        "accounts.VoiceEnrollment",
        on_delete=models.CASCADE,
        related_name="samples",
        null=True,
        blank=True,
    )
    audio = models.FileField(upload_to=_voice_sample_upload_to)

    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    voice_active_ms = models.PositiveIntegerField(null=True, blank=True)
    voice_ratio = models.FloatField(null=True, blank=True)
    vad_threshold = models.FloatField(null=True, blank=True)
    rms_in = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class AttendanceSession(models.Model):
    host = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="attendance_sessions",
    )
    name = models.CharField(max_length=200, blank=True, default="")
    is_active = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.id} by {self.host.email}"


class AttendanceRecord(models.Model):
    session = models.ForeignKey(
        "accounts.AttendanceSession",
        on_delete=models.CASCADE,
        related_name="records",
    )
    student = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    recognized_label = models.CharField(max_length=200, blank=True)
    recognized_name = models.CharField(max_length=200, blank=True)
    recognized_nim = models.CharField(max_length=50, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("session", "student")
        ordering = ["timestamp"]


class FaceLabelMapping(models.Model):
    label = models.CharField(max_length=200, unique=True)
    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="face_label_mappings",
    )

    def __str__(self):
        return f"{self.label} -> {self.user.email}"
