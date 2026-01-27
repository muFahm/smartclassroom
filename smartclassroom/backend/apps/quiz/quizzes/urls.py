from rest_framework.routers import DefaultRouter

from .views import QuizPackageViewSet, QuizQuestionViewSet, QuestionBankViewSet, QuizMediaUploadViewSet

router = DefaultRouter()
router.register(r"packages", QuizPackageViewSet, basename="quiz-package")
router.register(r"questions", QuizQuestionViewSet, basename="quiz-question")
router.register(r"question-bank", QuestionBankViewSet, basename="question-bank")
router.register(r"media", QuizMediaUploadViewSet, basename="quiz-media")

urlpatterns = router.urls
