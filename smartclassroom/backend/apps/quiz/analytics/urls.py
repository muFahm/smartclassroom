from rest_framework.routers import DefaultRouter

from .views import QuestionStatViewSet, ScoreSummaryViewSet, SessionSummaryViewSet

router = DefaultRouter()
router.register("questions", QuestionStatViewSet, basename="analytics-question-stats")
router.register("scores", ScoreSummaryViewSet, basename="analytics-score-summaries")
router.register("sessions", SessionSummaryViewSet, basename="analytics-sessions")

urlpatterns = router.urls
