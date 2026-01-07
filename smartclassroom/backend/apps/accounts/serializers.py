from rest_framework import serializers

from .models import CustomUser, FaceEnrollment, FaceSample


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
