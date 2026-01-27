from django.contrib import admin
from .models import AttendanceSession, AttendanceRecord


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
