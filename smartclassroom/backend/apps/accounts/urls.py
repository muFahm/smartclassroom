from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    EmailTokenObtainPairView,
    FaceEnrollmentCompleteView,
    FaceEnrollmentSampleUploadView,
    FaceEnrollmentStartView,
    ProfileView,
    login_view,
    logout_view,
    register_view,
)

urlpatterns = [
    path("register/", register_view, name="register"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", ProfileView.as_view(), name="profile"),
    path("biometrics/face/enrollments/start/", FaceEnrollmentStartView.as_view(), name="face_enrollment_start"),
    path(
        "biometrics/face/enrollments/<int:enrollment_id>/samples/",
        FaceEnrollmentSampleUploadView.as_view(),
        name="face_enrollment_upload_sample",
    ),
    path(
        "biometrics/face/enrollments/<int:enrollment_id>/complete/",
        FaceEnrollmentCompleteView.as_view(),
        name="face_enrollment_complete",
    ),
]
