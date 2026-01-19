from rest_framework import routers

from .views import (
    ClassroomViewSet,
    ClassSessionViewSet,
    CourseClassViewSet,
    CourseViewSet,
    SessionExportJobViewSet,
    SessionNoteViewSet,
)

router = routers.DefaultRouter()
router.register(r"classrooms", ClassroomViewSet, basename="classroom")
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"course-classes", CourseClassViewSet, basename="course-class")
router.register(r"class-sessions", ClassSessionViewSet, basename="class-session")
router.register(r"session-notes", SessionNoteViewSet, basename="session-note")
router.register(r"session-export-jobs", SessionExportJobViewSet, basename="session-export-job")

urlpatterns = router.urls
