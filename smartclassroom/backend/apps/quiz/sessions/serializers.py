import secrets
from typing import List

from django.utils import timezone
from rest_framework import serializers

from apps.quiz.quizzes.models import QuizQuestion
from .models import (
	DeviceResponse,
	PollingDevice,
	QuizSession,
	SessionParticipant,
	SessionQuestion,
)


class PollingDeviceSerializer(serializers.ModelSerializer):
	assigned_to_email = serializers.CharField(source="assigned_to.email", read_only=True)
	is_online = serializers.SerializerMethodField()

	class Meta:
		model = PollingDevice
		fields = [
			"id",
			"code",
			"hardware_uid",
			"assigned_to",
			"assigned_to_email",
			"status",
			"firmware_version",
			"battery_level",
			"last_seen",
			"last_rssi",
			"last_payload",
			"device_token",
			"claim_code",
			"is_online",
		]
		read_only_fields = ["device_token", "last_seen", "last_rssi", "last_payload", "is_online", "claim_code"]

	def get_is_online(self, obj):
		return obj.is_online


class SessionQuestionSerializer(serializers.ModelSerializer):
	question_text = serializers.CharField(source="question.body_text", read_only=True)
	options = serializers.SerializerMethodField()

	class Meta:
		model = SessionQuestion
		fields = [
			"id",
			"order",
			"is_open",
			"opened_at",
			"closed_at",
			"revealed_at",
			"question_text",
			"question_id",
			"options",
		]
		read_only_fields = fields

	def get_options(self, obj: SessionQuestion):
		return list(
			obj.question.options.values("id", "label", "body_text", "is_correct")
		)


class QuizSessionSerializer(serializers.ModelSerializer):
	host = serializers.CharField(source="host.username", read_only=True)
	package_title = serializers.CharField(source="package.title", read_only=True)
	questions = SessionQuestionSerializer(source="session_questions", many=True, read_only=True)

	class Meta:
		model = QuizSession
		fields = [
			"id",
			"package",
			"package_title",
			"code",
			"status",
			"host",
			"current_question",
			"started_at",
			"closed_at",
			"created_at",
			"questions",
		]
		read_only_fields = [
			"code",
			"status",
			"host",
			"current_question",
			"started_at",
			"closed_at",
			"created_at",
			"questions",
		]

	def create(self, validated_data):
		request = self.context["request"]
		package = validated_data["package"]
		session = QuizSession.objects.create(
			package=package,
			host=request.user,
			code=self._generate_code(),
		)
		self._seed_questions(session, package.questions.all())
		return session

	def _generate_code(self) -> str:
		for _ in range(5):
			code = secrets.token_hex(3).upper()
			if not QuizSession.objects.filter(code=code).exists():
				return code
		return secrets.token_hex(4).upper()

	def _seed_questions(self, session: QuizSession, questions: List[QuizQuestion]):
		bulk = [
			SessionQuestion(session=session, question=q, order=index + 1)
			for index, q in enumerate(questions.order_by("order", "id"))
		]
		SessionQuestion.objects.bulk_create(bulk)


class SessionParticipantSerializer(serializers.ModelSerializer):
	user_email = serializers.CharField(source="user.email", read_only=True)

	class Meta:
		model = SessionParticipant
		fields = ["id", "session", "user", "user_email", "device", "status"]
		read_only_fields = ["status"]


class SessionParticipantAdminSerializer(serializers.ModelSerializer):
	user_email = serializers.CharField(source="user.email", read_only=True)
	user_name = serializers.CharField(source="user.get_full_name", read_only=True)
	device_code = serializers.CharField(source="device.code", read_only=True)

	class Meta:
		model = SessionParticipant
		fields = [
			"id",
			"user_email",
			"user_name",
			"device_code",
			"status",
			"created_at",
		]


class DeviceResponseSerializer(serializers.ModelSerializer):
	class Meta:
		model = DeviceResponse
		fields = ["id", "session_question", "participant", "option", "source", "submitted_at"]
		read_only_fields = ["submitted_at"]

	def validate(self, attrs):
		participant = attrs["participant"]
		session_question = attrs["session_question"]
		if participant.session_id != session_question.session_id:
			raise serializers.ValidationError("Peserta tidak tergabung pada sesi ini.")
		if not session_question.is_open:
			raise serializers.ValidationError("Pertanyaan belum dibuka atau sudah ditutup.")
		return attrs

	def create(self, validated_data):
		validated_data.setdefault("source", DeviceResponse.SOURCE_WEB)
		validated_data["submitted_at"] = timezone.now()
		DeviceResponse.objects.filter(
			session_question=validated_data["session_question"],
			participant=validated_data["participant"],
		).delete()
		return super().create(validated_data)
