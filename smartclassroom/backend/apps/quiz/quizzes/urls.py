from rest_framework.routers import DefaultRouter

from .views import QuizPackageViewSet, QuizQuestionViewSet

router = DefaultRouter()
router.register(r"packages", QuizPackageViewSet, basename="quiz-package")
router.register(r"questions", QuizQuestionViewSet, basename="quiz-question")

urlpatterns = router.urls
