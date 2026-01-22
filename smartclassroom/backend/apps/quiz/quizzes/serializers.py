from typing import List

from rest_framework import serializers

from .models import QuizOption, QuizPackage, QuizQuestion


class QuizOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizOption
        fields = ["id", "label", "body_text", "is_correct"]


class QuizQuestionSerializer(serializers.ModelSerializer):
    options = QuizOptionSerializer(many=True)

    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "package",
            "body_text",
            "explanation",
            "media_url",
            "question_type",
            "difficulty_tag",
            "order",
            "is_active",
            "options",
        ]
        read_only_fields = ["package"]

    def validate_options(self, value: List[dict]):
        if len(value) < 2:
            raise serializers.ValidationError("Setidaknya harus ada dua opsi jawaban.")
        correct_count = sum(1 for option in value if option.get("is_correct"))
        question_type = self.initial_data.get("question_type", QuizQuestion.TYPE_SINGLE)
        if correct_count == 0:
            raise serializers.ValidationError("Tentukan minimal satu jawaban yang benar.")
        if question_type == QuizQuestion.TYPE_SINGLE and correct_count != 1:
            raise serializers.ValidationError("Soal pilihan tunggal hanya boleh punya satu jawaban benar.")
        return value

    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        package = self.context["package"]
        question = QuizQuestion.objects.create(package=package, **validated_data)
        self._upsert_options(question, options_data)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            instance.options.all().delete()
            self._upsert_options(instance, options_data)
        return instance

    def _upsert_options(self, question: QuizQuestion, options_data: List[dict]):
        to_create = []
        for idx, option in enumerate(options_data):
            label = option.get("label") or chr(65 + idx)
            to_create.append(
                QuizOption(
                    question=question,
                    label=label.upper(),
                    body_text=option["body_text"],
                    is_correct=option.get("is_correct", False),
                )
            )
        QuizOption.objects.bulk_create(to_create)


class QuizPackageSerializer(serializers.ModelSerializer):
    owner = serializers.CharField(source="owner.username", read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = QuizPackage
        fields = [
            "id",
            "title",
            "description",
            "topic",
            "visibility",
            "metadata",
            "is_archived",
            "owner",
            "question_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["owner", "created_at", "updated_at", "question_count"]

    def get_question_count(self, obj: QuizPackage) -> int:
        return obj.questions.count()
