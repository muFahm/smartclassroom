"""Signals to keep analytics aggregates synchronized."""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.quiz.sessions.models import DeviceResponse, SessionParticipant, SessionQuestion
from .models import QuestionStat, ScoreSummary
from .services import refresh_question_stat, refresh_score_summary


def _schedule(callback):
    """Execute update hooks immediately while keeping a single call site."""
    callback()


@receiver(post_save, sender=SessionQuestion)
def ensure_question_stat_exists(sender, instance: SessionQuestion, created: bool, **_: dict):
    if not created:
        return

    def create_stat():
        QuestionStat.objects.get_or_create(session_question=instance)

    _schedule(create_stat)


@receiver(post_save, sender=SessionParticipant)
def ensure_score_summary_exists(sender, instance: SessionParticipant, created: bool, **_: dict):
    if not created:
        return

    def create_summary():
        ScoreSummary.objects.get_or_create(
            participant=instance,
            defaults={"session": instance.session},
        )

    _schedule(create_summary)


@receiver(post_save, sender=DeviceResponse)
def update_stats_after_response_save(sender, instance: DeviceResponse, **_: dict):
    def update():
        refresh_question_stat(instance.session_question_id)
        refresh_score_summary(instance.participant_id)

    _schedule(update)


@receiver(post_delete, sender=DeviceResponse)
def update_stats_after_response_delete(sender, instance: DeviceResponse, **_: dict):
    def update():
        refresh_question_stat(instance.session_question_id)
        refresh_score_summary(instance.participant_id)

    _schedule(update)
