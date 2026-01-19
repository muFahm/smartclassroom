from django.urls import include, path

urlpatterns = [
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/quiz/", include("apps.quiz.quizzes.urls")),
    path("api/quiz/runtime/", include("apps.quiz.sessions.urls")),
    path("api/quiz/analytics/", include("apps.quiz.analytics.urls")),
    path("api/classrooms/", include("apps.classrooms.urls")),
]
