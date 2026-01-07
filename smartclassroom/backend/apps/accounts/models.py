from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


def _face_sample_upload_to(instance, filename: str) -> str:
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    prompt = getattr(instance, "prompt_type", "unknown")
    return f"biometrics/faces/user_{instance.user_id}/{prompt}/{ts}_{filename}"


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
