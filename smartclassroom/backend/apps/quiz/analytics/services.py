"""Utility functions for keeping analytics aggregates in sync."""

from __future__ import annotations

from django.db.models import Count, F

from apps.quiz.sessions.models import SessionParticipant, SessionQuestion
from .models import QuestionStat, ScoreSummary


def refresh_question_stat(session_question_id: int) -> None:
    """Recalculate aggregates for a session question."""
    session_question = (
        SessionQuestion.objects.select_related("question", "session")
        .prefetch_related("question__options")
        .filter(id=session_question_id)
        .first()
    )
    if not session_question:
        return

    responses = session_question.responses.select_related("option")
    total = responses.count()
    correct = responses.filter(option__is_correct=True).count()
    distribution = {
        row["label"]: row["count"]
        for row in responses.values(label=F("option__label")).annotate(count=Count("id"))
    }
    accuracy = (correct / total * 100) if total else 0
    QuestionStat.objects.update_or_create(
        session_question=session_question,
        defaults={
            "total_responses": total,
            "correct_responses": correct,
            "accuracy": accuracy,
            "distribution": distribution,
        },
    )


def refresh_score_summary(participant_id: int) -> None:
    """Recalculate aggregates for a participant inside a session."""
    participant = (
        SessionParticipant.objects.select_related("session", "user")
        .filter(id=participant_id)
        .first()
    )
    if not participant:
        return

    responses = participant.responses.select_related("option")
    answered = responses.count()
    correct = responses.filter(option__is_correct=True).count()
    total_questions = participant.session.session_questions.count()
    accuracy = (correct / total_questions * 100) if total_questions else 0
    ScoreSummary.objects.update_or_create(
        participant=participant,
        defaults={
            "session": participant.session,
            "total_questions": total_questions,
            "answered_questions": answered,
            "correct_answers": correct,
            "accuracy": accuracy,
        },
    )
