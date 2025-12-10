from rest_framework.routers import DefaultRouter

from .views import (
    DeviceResponseViewSet,
    PollingDeviceViewSet,
    QuizSessionViewSet,
    SessionParticipantViewSet,
)

router = DefaultRouter()
router.register(r"devices", PollingDeviceViewSet, basename="polling-device")
router.register(r"sessions", QuizSessionViewSet, basename="quiz-session")
router.register(r"participants", SessionParticipantViewSet, basename="session-participant")
router.register(r"responses", DeviceResponseViewSet, basename="device-response")

urlpatterns = router.urls
