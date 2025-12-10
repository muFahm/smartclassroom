import secrets
from django.conf import settings
from django.db import models

from apps.quiz.quizzes.models import QuizOption, QuizPackage, QuizQuestion


class TimeStampedModel(models.Model):
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		abstract = True


class PollingDevice(TimeStampedModel):
	STATUS_AVAILABLE = "available"
	STATUS_ASSIGNED = "assigned"
	STATUS_MAINTENANCE = "maintenance"
	STATUS_CHOICES = [
		(STATUS_AVAILABLE, "Available"),
		(STATUS_ASSIGNED, "Assigned"),
		(STATUS_MAINTENANCE, "Maintenance"),
	]

	code = models.CharField(max_length=12, unique=True)
	hardware_uid = models.CharField(max_length=32, unique=True)
	assigned_to = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="devices",
	)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
	firmware_version = models.CharField(max_length=20, blank=True)
	battery_level = models.PositiveIntegerField(default=0)
	last_seen = models.DateTimeField(null=True, blank=True)
	device_token = models.CharField(max_length=64, default="", blank=True)

	class Meta:
		ordering = ["code"]

	def refresh_token(self):
		self.device_token = secrets.token_hex(16)
		self.save(update_fields=["device_token"])


class QuizSession(TimeStampedModel):
	STATUS_DRAFT = "draft"
	STATUS_LIVE = "live"
	STATUS_REVIEW = "review"
	STATUS_CLOSED = "closed"
	STATUS_CHOICES = [
		(STATUS_DRAFT, "Draft"),
		(STATUS_LIVE, "Live"),
		(STATUS_REVIEW, "Review"),
		(STATUS_CLOSED, "Closed"),
	]

	package = models.ForeignKey(QuizPackage, on_delete=models.CASCADE, related_name="sessions")
	host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hosted_sessions")
	code = models.CharField(max_length=8, unique=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
	current_question = models.ForeignKey(
		"SessionQuestion",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="current_for_sessions",
	)
	started_at = models.DateTimeField(null=True, blank=True)
	closed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return f"Session {self.code} - {self.package.title}"


class SessionParticipant(TimeStampedModel):
	STATUS_INVITED = "invited"
	STATUS_CONNECTED = "connected"
	STATUS_DISCONNECTED = "disconnected"
	STATUS_CHOICES = [
		(STATUS_INVITED, "Invited"),
		(STATUS_CONNECTED, "Connected"),
		(STATUS_DISCONNECTED, "Disconnected"),
	]

	session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name="participants")
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_participations")
	device = models.ForeignKey(PollingDevice, on_delete=models.SET_NULL, null=True, blank=True, related_name="active_participations")
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_INVITED)

	class Meta:
		unique_together = ("session", "user")


class SessionQuestion(TimeStampedModel):
	session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name="session_questions")
	question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE)
	order = models.PositiveIntegerField()
	is_open = models.BooleanField(default=False)
	opened_at = models.DateTimeField(null=True, blank=True)
	closed_at = models.DateTimeField(null=True, blank=True)
	revealed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ["order"]
		unique_together = ("session", "question")


class DeviceResponse(TimeStampedModel):
	SOURCE_DEVICE = "device"
	SOURCE_WEB = "web"
	SOURCE_CHOICES = [
		(SOURCE_DEVICE, "Polling Device"),
		(SOURCE_WEB, "Web"),
	]

	session_question = models.ForeignKey(SessionQuestion, on_delete=models.CASCADE, related_name="responses")
	participant = models.ForeignKey(SessionParticipant, on_delete=models.CASCADE, related_name="responses")
	option = models.ForeignKey(QuizOption, on_delete=models.CASCADE)
	submitted_at = models.DateTimeField(auto_now_add=True)
	source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default=SOURCE_DEVICE)

	class Meta:
		unique_together = ("session_question", "participant")
