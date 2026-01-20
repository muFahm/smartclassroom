from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    EmailTokenObtainPairView,
    FaceEnrollmentCompleteView,
    FaceEnrollmentSampleUploadView,
    FaceEnrollmentStartView,
    VoiceEnrollmentCompleteView,
    VoiceEnrollmentSampleUploadView,
    VoiceEnrollmentStartView,
    AttendanceSessionStartView,
    AttendanceRecognizeView,
    AttendanceSessionStopView,
    AttendanceSessionRecordsView,
    FaceEncodingsReloadView,
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
    path("biometrics/voice/enrollments/start/", VoiceEnrollmentStartView.as_view(), name="voice_enrollment_start"),
    path(
        "biometrics/voice/enrollments/<int:enrollment_id>/samples/",
        VoiceEnrollmentSampleUploadView.as_view(),
        name="voice_enrollment_upload_sample",
    ),
    path(
        "biometrics/voice/enrollments/<int:enrollment_id>/complete/",
        VoiceEnrollmentCompleteView.as_view(),
        name="voice_enrollment_complete",
    ),
    path("attendance/sessions/start/", AttendanceSessionStartView.as_view(), name="attendance_session_start"),
    path(
        "attendance/sessions/<int:session_id>/recognize/",
        AttendanceRecognizeView.as_view(),
        name="attendance_session_recognize",
    ),
    path(
        "attendance/sessions/<int:session_id>/stop/",
        AttendanceSessionStopView.as_view(),
        name="attendance_session_stop",
    ),
    path(
        "attendance/sessions/<int:session_id>/records/",
        AttendanceSessionRecordsView.as_view(),
        name="attendance_session_records",
    ),
    path("biometrics/face/reload/", FaceEncodingsReloadView.as_view(), name="face_encodings_reload"),
]
