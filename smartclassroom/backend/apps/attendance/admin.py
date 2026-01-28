from django.contrib import admin
from .models import (
    AttendanceSession, AttendanceRecord,
    SisCourse, SisLecturer, SisStudent, SisCourseClass, 
    SisCourseClassLecturer, SisEnrollment,
    BiometricRegistration, BiometricFaceDataset, BiometricVoiceDataset
)


# ==========================================
# SIS Master Data Admin
# ==========================================

@admin.register(SisCourse)
class SisCourseAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'name', 'program', 'updated_at']
    list_filter = ['program']
    search_fields = ['id', 'code', 'name']
    ordering = ['code']


@admin.register(SisLecturer)
class SisLecturerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'id_staff', 'updated_at']
    search_fields = ['id', 'name']
    ordering = ['name']


@admin.register(SisStudent)
class SisStudentAdmin(admin.ModelAdmin):
    list_display = ['nim', 'name', 'program', 'updated_at']
    list_filter = ['program']
    search_fields = ['nim', 'name']
    ordering = ['nim']


class SisEnrollmentInline(admin.TabularInline):
    model = SisEnrollment
    extra = 0
    raw_id_fields = ['student']


class SisCourseClassLecturerInline(admin.TabularInline):
    model = SisCourseClassLecturer
    extra = 0
    raw_id_fields = ['lecturer']


@admin.register(SisCourseClass)
class SisCourseClassAdmin(admin.ModelAdmin):
    list_display = ['id', 'course', 'class_code', 'day', 'room', 'start_time', 'end_time']
    list_filter = ['day', 'course__program']
    search_fields = ['id', 'course__name', 'course__code']
    raw_id_fields = ['course']
    inlines = [SisCourseClassLecturerInline, SisEnrollmentInline]
    ordering = ['course__code', 'class_code']


@admin.register(SisEnrollment)
class SisEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'course_class']
    search_fields = ['student__nim', 'course_class__course__name']
    raw_id_fields = ['student', 'course_class']


# ==========================================
# Attendance Admin
# ==========================================


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    readonly_fields = ['created_at', 'updated_at']
    fields = ['student_id', 'student_name', 'status', 'face_recognized', 'notes']


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = [
        'course_name', 'class_name', 'date', 'lecturer_name', 
        'status', 'total_students', 'present_count'
    ]
    list_filter = ['status', 'date', 'course_code', 'lecturer_id']
    search_fields = ['course_name', 'course_code', 'lecturer_name', 'class_name']
    date_hierarchy = 'date'
    readonly_fields = ['id', 'created_at', 'updated_at', 'completed_at']
    inlines = [AttendanceRecordInline]
    
    fieldsets = (
        ('Course Information', {
            'fields': ('course_code', 'course_name', 'class_name')
        }),
        ('Lecturer Information', {
            'fields': ('lecturer_id', 'lecturer_name')
        }),
        ('Session Details', {
            'fields': ('date', 'day_name', 'start_time', 'end_time', 'status')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        'student_name', 'student_id', 'session', 'status', 
        'face_recognized', 'created_at'
    ]
    list_filter = ['status', 'face_recognized', 'session__date']
    search_fields = ['student_name', 'student_id', 'session__course_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student_id', 'student_name', 'student_photo_url')
        }),
        ('Attendance Details', {
            'fields': ('session', 'status', 'notes')
        }),
        ('Face Recognition', {
            'fields': ('face_recognized', 'recognized_at', 'confidence_score'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(BiometricRegistration)
class BiometricRegistrationAdmin(admin.ModelAdmin):
    list_display = ['student_nim', 'student_name', 'lecturer_id', 'is_complete', 'created_at']
    list_filter = ['is_complete', 'created_at']
    search_fields = ['student_nim', 'student_name', 'lecturer_id']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'student_nim', 'student_name')
        }),
        ('Lecturer Information', {
            'fields': ('lecturer_id', 'lecturer_name')
        }),
        ('Face Data', {
            'fields': ('face_front', 'face_left', 'face_right', 'face_up'),
            'classes': ('collapse',)
        }),
        ('Voice Data', {
            'fields': (
                'voice_prompt_1_text', 'voice_recording_1',
                'voice_prompt_2_text', 'voice_recording_2'
            ),
            'classes': ('collapse',)
        }),
        ('Status & Timestamps', {
            'fields': ('is_complete', 'created_at', 'updated_at'),
        }),
    )


@admin.register(BiometricFaceDataset)
class BiometricFaceDatasetAdmin(admin.ModelAdmin):
    list_display = ['student_nim', 'student_name', 'created_at']
    list_filter = ['created_at']
    search_fields = ['student_nim', 'student_name']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'student_nim', 'student_name')
        }),
        ('Face Data', {
            'fields': ('face_front', 'face_left', 'face_right', 'face_up'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(BiometricVoiceDataset)
class BiometricVoiceDatasetAdmin(admin.ModelAdmin):
    list_display = ['student_nim', 'student_name', 'created_at']
    list_filter = ['created_at']
    search_fields = ['student_nim', 'student_name']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'student_nim', 'student_name')
        }),
        ('Voice Data', {
            'fields': (
                'voice_prompt_1_text', 'voice_recording_1',
                'voice_prompt_2_text', 'voice_recording_2'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
