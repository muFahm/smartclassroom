from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path("api/accounts/", include("accounts.urls")),
    path("api/quiz/", include("apps.quiz.quizzes.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
