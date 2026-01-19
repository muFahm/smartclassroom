from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import AttendanceRecord
from apps.quiz.sessions.models import QuizSession
from .models import (
    Classroom,
    Course,
    CourseClass,
    ClassSession,
    SessionExportJob,
    SessionNote,
)

User = get_user_model()


class ClassroomSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source="owner.email", read_only=True)

    class Meta:
        model = Classroom
        fields = [
            "id",
            "code",
            "name",
            "location",
            "capacity",
            "facilities",
            "metadata",
            "is_active",
            "owner",
            "owner_email",
            "allowed_lecturers",
            "students",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "owner_email"]


class CourseSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source="owner.email", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "name",
            "description",
            "credits",
            "program",
            "semester_label",
            "metadata",
            "is_archived",
            "owner",
            "owner_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "owner_email"]


class CourseClassSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    lecturer_email = serializers.CharField(source="lecturer.email", read_only=True)
    classroom_code = serializers.CharField(source="classroom.code", read_only=True)

    class Meta:
        model = CourseClass
        fields = [
            "id",
            "course",
            "course_name",
            "course_code",
            "classroom",
            "classroom_code",
            "lecturer",
            "lecturer_email",
            "academic_year",
            "term",
            "schedule_day",
            "schedule_start",
            "schedule_end",
            "schedule_note",
            "max_students",
            "is_active",
            "students",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "course_name", "course_code", "lecturer_email", "classroom_code"]


class ClassSessionSerializer(serializers.ModelSerializer):
    course_class_name = serializers.CharField(source="course_class.course.name", read_only=True)
    lecturer_email = serializers.CharField(source="course_class.lecturer.email", read_only=True)
    classroom_code = serializers.CharField(source="classroom.code", read_only=True)
    attendance_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassSession
        fields = [
            "id",
            "course_class",
            "course_class_name",
            "classroom",
            "classroom_code",
            "topic",
            "agenda",
            "scheduled_start",
            "scheduled_end",
            "actual_start",
            "actual_end",
            "status",
            "meeting_url",
            "attendance_session",
            "quiz_session",
            "lecturer_email",
            "attendance_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "course_class_name",
            "lecturer_email",
            "classroom_code",
            "attendance_count",
        ]

    def get_attendance_count(self, obj: ClassSession) -> int:
        if not obj.attendance_session_id:
            return 0
        return AttendanceRecord.objects.filter(session_id=obj.attendance_session_id).count()


class SessionNoteSerializer(serializers.ModelSerializer):
    last_edited_by_email = serializers.CharField(source="last_edited_by.email", read_only=True)

    class Meta:
        model = SessionNote
        fields = [
            "id",
            "class_session",
            "transcript",
            "summary",
            "status",
            "source_url",
            "last_edited_by",
            "last_edited_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "last_edited_by_email"]


class SessionExportJobSerializer(serializers.ModelSerializer):
    requested_by_email = serializers.CharField(source="requested_by.email", read_only=True)

    class Meta:
        model = SessionExportJob
        fields = [
            "id",
            "class_session",
            "requested_by",
            "requested_by_email",
            "export_format",
            "status",
            "file_path",
            "error_message",
            "requested_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "requested_by_email",
            "status",
            "file_path",
            "error_message",
            "requested_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        # Ensure requested_by defaults to current user if not explicitly set.
        if "requested_by" not in validated_data:
            user = self.context.get("request").user if self.context.get("request") else None
            if user:
                validated_data["requested_by"] = user
        return super().create(validated_data)
