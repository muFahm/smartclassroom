from django.contrib import admin

from .models import DeviceResponse, PollingDevice, QuizSession, SessionParticipant, SessionQuestion


@admin.register(PollingDevice)
class PollingDeviceAdmin(admin.ModelAdmin):
	list_display = ("code", "hardware_uid", "status", "assigned_to", "last_seen")
	search_fields = ("code", "hardware_uid", "assigned_to__email")


class SessionQuestionInline(admin.TabularInline):
	model = SessionQuestion
	extra = 0


@admin.register(QuizSession)
class QuizSessionAdmin(admin.ModelAdmin):
	list_display = ("code", "package", "host", "status", "created_at")
	list_filter = ("status",)
	inlines = [SessionQuestionInline]


@admin.register(SessionParticipant)
class SessionParticipantAdmin(admin.ModelAdmin):
	list_display = ("session", "user", "device", "status")
	list_filter = ("status",)


@admin.register(DeviceResponse)
class DeviceResponseAdmin(admin.ModelAdmin):
	list_display = ("session_question", "participant", "option", "submitted_at", "source")
	list_filter = ("source",)
