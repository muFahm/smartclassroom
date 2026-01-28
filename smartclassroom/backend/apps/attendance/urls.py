from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceSessionViewSet,
    AttendanceRecordViewSet,
    student_attendance_history,
    student_attendance_summary,
    bulk_update_attendance,
    student_enrollments,
    student_course_attendance,
    student_all_courses_attendance
)

app_name = 'attendance'

router = DefaultRouter()
router.register(r'sessions', AttendanceSessionViewSet, basename='session')
router.register(r'records', AttendanceRecordViewSet, basename='record')

urlpatterns = [
    path('', include(router.urls)),
    # Student-specific endpoints (untuk mahasiswa)
    path('student/<str:student_id>/history/', student_attendance_history, name='student-history'),
    path('student/<str:student_id>/summary/', student_attendance_summary, name='student-summary'),
    # Student enrollments and attendance by course
    path('student/<str:nim>/enrollments/', student_enrollments, name='student-enrollments'),
    path('student/<str:nim>/course/<str:course_id>/attendance/', student_course_attendance, name='student-course-attendance'),
    path('student/<str:nim>/all-courses/', student_all_courses_attendance, name='student-all-courses'),
    # Bulk operations
    path('sessions/<uuid:session_id>/bulk-update/', bulk_update_attendance, name='bulk-update'),
]
