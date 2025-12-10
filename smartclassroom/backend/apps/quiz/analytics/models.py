from django.db import models

from apps.quiz.sessions.models import QuizSession, SessionParticipant, SessionQuestion


class TimeStampedModel(models.Model):
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		abstract = True


class QuestionStat(TimeStampedModel):
	session_question = models.OneToOneField(
		SessionQuestion,
		on_delete=models.CASCADE,
		related_name="stat",
	)
	total_responses = models.PositiveIntegerField(default=0)
	correct_responses = models.PositiveIntegerField(default=0)
	accuracy = models.FloatField(default=0)
	distribution = models.JSONField(default=dict, blank=True)

	class Meta:
		ordering = ["session_question__order"]

	def __str__(self) -> str:
		return f"Stat SQ{self.session_question_id}"


class ScoreSummary(TimeStampedModel):
	session = models.ForeignKey(
		QuizSession,
		on_delete=models.CASCADE,
		related_name="score_summaries",
	)
	participant = models.OneToOneField(
		SessionParticipant,
		on_delete=models.CASCADE,
		related_name="score_summary",
	)
	total_questions = models.PositiveIntegerField(default=0)
	answered_questions = models.PositiveIntegerField(default=0)
	correct_answers = models.PositiveIntegerField(default=0)
	accuracy = models.FloatField(default=0)

	class Meta:
		ordering = ["-accuracy", "participant__created_at"]

	def __str__(self) -> str:
		return f"Score {self.participant_id}"
