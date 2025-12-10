from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.response import Response

from apps.common.permissions import IsLecturer
from apps.quiz.sessions.models import QuizSession
from .models import QuestionStat, ScoreSummary
from .serializers import (
	QuestionStatSerializer,
	ScoreSummarySerializer,
	SessionOverviewSerializer,
	SessionSummarySerializer,
)


class QuestionStatViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = QuestionStatSerializer
	permission_classes = [IsLecturer]
	filterset_fields = ["session_question__session"]
	search_fields = ["session_question__question__body_text"]

	def get_queryset(self):
		return (
			QuestionStat.objects.select_related(
				"session_question",
				"session_question__session",
				"session_question__question",
			)
			.prefetch_related("session_question__question__options")
			.filter(session_question__session__host=self.request.user)
		)


class ScoreSummaryViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = ScoreSummarySerializer
	permission_classes = [IsLecturer]
	filterset_fields = ["session"]
	ordering = ["-accuracy", "participant__created_at"]

	def get_queryset(self):
		return (
			ScoreSummary.objects.select_related("participant__user", "session")
			.filter(session__host=self.request.user)
			.order_by("-accuracy", "participant__created_at")
		)


class SessionSummaryViewSet(viewsets.ViewSet):
	permission_classes = [IsLecturer]

	def list(self, request):
		sessions = (
			QuizSession.objects.filter(host=request.user)
			.select_related("package")
			.order_by("-created_at")
		)
		serializer = SessionOverviewSerializer(sessions, many=True)
		return Response(serializer.data)

	def retrieve(self, request, pk=None):
		session = get_object_or_404(
			QuizSession.objects.filter(host=request.user).select_related("package"),
			pk=pk,
		)
		question_stats = (
			QuestionStat.objects.filter(session_question__session=session)
			.select_related("session_question__question", "session_question__session")
			.prefetch_related("session_question__question__options")
			.order_by("session_question__order")
		)
		score_summaries = (
			session.score_summaries.select_related("participant__user").order_by("-accuracy", "participant__created_at")
		)
		serializer = SessionSummarySerializer(
			{
				"session": session,
				"question_stats": question_stats,
				"scores": score_summaries,
			}
		)
		return Response(serializer.data)
