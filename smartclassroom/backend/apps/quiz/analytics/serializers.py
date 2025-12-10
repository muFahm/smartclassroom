from rest_framework import serializers

from apps.quiz.sessions.models import QuizSession
from .models import QuestionStat, ScoreSummary


class QuestionStatSerializer(serializers.ModelSerializer):
	question_text = serializers.CharField(source="session_question.question.body_text", read_only=True)
	question_order = serializers.IntegerField(source="session_question.order", read_only=True)
	correct_options = serializers.SerializerMethodField()

	class Meta:
		model = QuestionStat
		fields = [
			"id",
			"session_question",
			"question_order",
			"question_text",
			"total_responses",
			"correct_responses",
			"accuracy",
			"distribution",
			"correct_options",
		]
		read_only_fields = fields

	def get_correct_options(self, obj: QuestionStat):
		question = obj.session_question.question
		return list(question.options.filter(is_correct=True).values_list("label", flat=True))


class ScoreSummarySerializer(serializers.ModelSerializer):
	participant_email = serializers.CharField(source="participant.user.email", read_only=True)
	participant_name = serializers.CharField(source="participant.user.get_full_name", read_only=True)

	class Meta:
		model = ScoreSummary
		fields = [
			"id",
			"session",
			"participant",
			"participant_email",
			"participant_name",
			"total_questions",
			"answered_questions",
			"correct_answers",
			"accuracy",
			"updated_at",
		]
		read_only_fields = fields


class SessionOverviewSerializer(serializers.ModelSerializer):
	package_title = serializers.CharField(source="package.title", read_only=True)

	class Meta:
		model = QuizSession
		fields = [
			"id",
			"code",
			"package_title",
			"status",
			"started_at",
			"closed_at",
			"created_at",
		]
		read_only_fields = fields


class SessionSummarySerializer(serializers.Serializer):
	session = SessionOverviewSerializer()
	question_stats = QuestionStatSerializer(many=True)
	scores = ScoreSummarySerializer(many=True)
