from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import CustomUser
from apps.quiz.analytics.models import QuestionStat, ScoreSummary
from apps.quiz.quizzes.models import QuizOption, QuizPackage, QuizQuestion
from apps.quiz.sessions.models import DeviceResponse, QuizSession, SessionParticipant, SessionQuestion


class AnalyticsPipelineTests(APITestCase):
    def setUp(self):
        self.lecturer = CustomUser.objects.create_user(
            email="lecturer@example.com",
            username="lecturer",
            password="pass123",
            role="lecturer",
        )
        self.student = CustomUser.objects.create_user(
            email="student@example.com",
            username="student",
            password="pass123",
            role="student",
        )
        self.package = QuizPackage.objects.create(owner=self.lecturer, title="Sample Package")
        self.question = QuizQuestion.objects.create(package=self.package, body_text="2 + 2?", order=1)
        self.option_a = QuizOption.objects.create(question=self.question, label="A", body_text="3", is_correct=False)
        self.option_b = QuizOption.objects.create(question=self.question, label="B", body_text="4", is_correct=True)
        self.session = QuizSession.objects.create(package=self.package, host=self.lecturer, code="SESSION1")
        self.session_question = SessionQuestion.objects.create(session=self.session, question=self.question, order=1)
        self.participant = SessionParticipant.objects.create(session=self.session, user=self.student)

    def test_question_stat_updates_after_response(self):
        DeviceResponse.objects.create(
            session_question=self.session_question,
            participant=self.participant,
            option=self.option_b,
        )
        stat = QuestionStat.objects.get(session_question=self.session_question)
        summary = ScoreSummary.objects.get(participant=self.participant)

        self.assertEqual(stat.total_responses, 1)
        self.assertEqual(stat.correct_responses, 1)
        self.assertEqual(summary.correct_answers, 1)
        self.assertEqual(summary.total_questions, 1)
        self.assertAlmostEqual(summary.accuracy, 100)

    def test_session_summary_endpoint_returns_data(self):
        DeviceResponse.objects.create(
            session_question=self.session_question,
            participant=self.participant,
            option=self.option_b,
        )
        self.client.force_authenticate(user=self.lecturer)
        url = reverse("analytics-sessions-detail", args=[self.session.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("session", response.data)
        self.assertIn("question_stats", response.data)
        self.assertGreaterEqual(len(response.data["question_stats"]), 1)
        self.assertIn("scores", response.data)
        self.assertEqual(response.data["scores"][0]["correct_answers"], 1)
