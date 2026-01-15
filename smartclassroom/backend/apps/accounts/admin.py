from django.contrib import admin
from .models import CustomUser, FaceEnrollment, FaceSample, VoiceEnrollment, VoiceSample, AttendanceSession, AttendanceRecord, FaceLabelMapping


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("email", "username", "role")


@admin.register(FaceEnrollment)
class FaceEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_active", "created_at")


@admin.register(FaceSample)
class FaceSampleAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "prompt_type", "created_at")


@admin.register(VoiceEnrollment)
class VoiceEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_active", "created_at")


@admin.register(VoiceSample)
class VoiceSampleAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "duration_ms", "voice_active_ms", "created_at")


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "host", "is_active", "started_at", "ended_at")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "student", "timestamp")


@admin.register(FaceLabelMapping)
class FaceLabelMappingAdmin(admin.ModelAdmin):
    list_display = ("label", "user")
