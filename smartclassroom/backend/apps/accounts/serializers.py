from rest_framework import serializers

from .models import CustomUser, FaceEnrollment, FaceSample, VoiceEnrollment, VoiceSample


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ["email", "password", "role", "username"]

    def create(self, validated_data):
        return CustomUser.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
            role=validated_data.get("role", "student"),
        )


class FaceEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaceEnrollment
        fields = [
            "id",
            "model_name",
            "model_version",
            "embedding",
            "quality_score",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class FaceEnrollmentStartResponseSerializer(serializers.Serializer):
    enrollment_id = serializers.IntegerField()
    required_prompts = serializers.ListField(child=serializers.CharField())


class FaceSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaceSample
        fields = [
            "id",
            "prompt_type",
            "image",
            "embedding",
            "detector_confidence",
            "blur_score",
            "created_at",
        ]
        read_only_fields = fields


class FaceSampleUploadSerializer(serializers.Serializer):
    prompt_type = serializers.ChoiceField(choices=FaceSample.PROMPT_CHOICES)
    image = serializers.ImageField()


class VoiceEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceEnrollment
        fields = [
            "id",
            "model_name",
            "model_version",
            "embedding",
            "quality_score",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class VoiceEnrollmentStartResponseSerializer(serializers.Serializer):
    enrollment_id = serializers.IntegerField()
    min_voice_active_ms = serializers.IntegerField()


class VoiceSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceSample
        fields = [
            "id",
            "audio",
            "duration_ms",
            "voice_active_ms",
            "voice_ratio",
            "vad_threshold",
            "rms_in",
            "created_at",
        ]
        read_only_fields = fields


class VoiceSampleUploadSerializer(serializers.Serializer):
    audio = serializers.FileField()


class AttendanceSessionStartResponseSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()

    class Meta:
        model = None  # set at import time
        fields = ["id", "student", "recognized_label", "recognized_name", "recognized_nim", "timestamp"]
        read_only_fields = fields

    def get_student(self, obj):
        user = obj.student
        return {"id": user.id, "username": user.username, "email": user.email}


class AttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = None  # set at import time
        fields = ["id", "host", "name", "is_active", "started_at", "ended_at", "created_at"]
        read_only_fields = fields


# Set model references (avoids circular import problems)
from .models import AttendanceSession, AttendanceRecord  # noqa: E402

AttendanceRecordSerializer.Meta.model = AttendanceRecord
AttendanceSessionSerializer.Meta.model = AttendanceSession
