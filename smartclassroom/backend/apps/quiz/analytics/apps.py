from django.apps import AppConfig


class QuizAnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.quiz.analytics"
    label = "quiz_analytics"

    def ready(self):  # pragma: no cover - import side effects only
        from . import signals  # noqa: F401
