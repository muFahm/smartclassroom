from django.contrib import admin

from .models import QuestionStat, ScoreSummary


@admin.register(QuestionStat)
class QuestionStatAdmin(admin.ModelAdmin):
	list_display = ["session_question", "total_responses", "correct_responses", "accuracy", "updated_at"]
	search_fields = ["session_question__session__code", "session_question__session__package__title"]
	list_select_related = ["session_question", "session_question__session"]


@admin.register(ScoreSummary)
class ScoreSummaryAdmin(admin.ModelAdmin):
	list_display = [
		"participant",
		"session",
		"total_questions",
		"answered_questions",
		"correct_answers",
		"accuracy",
	]
	search_fields = ["session__code", "participant__user__email"]
	list_select_related = ["participant", "session"]
