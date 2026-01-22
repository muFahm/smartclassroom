from django.urls import path, include

urlpatterns = [
    path("api/accounts/", include("accounts.urls")),
    path("api/quiz/", include("apps.quiz.quizzes.urls")),
]
