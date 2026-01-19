import csv
import io
import json
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.http import FileResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.models import AttendanceRecord
from apps.common.permissions import IsLecturer
from .models import (
    Classroom,
    Course,
    CourseClass,
    ClassSession,
    SessionExportJob,
    SessionNote,
)
from .serializers import (
    ClassroomSerializer,
    CourseClassSerializer,
    CourseSerializer,
    ClassSessionSerializer,
    SessionExportJobSerializer,
    SessionNoteSerializer,
)


class ClassroomViewSet(viewsets.ModelViewSet):
    queryset = Classroom.objects.all().prefetch_related("allowed_lecturers", "students")
    serializer_class = ClassroomSerializer
    permission_classes = [IsLecturer]
    filterset_fields = ["is_active", "location"]
    search_fields = ["code", "name", "location"]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsLecturer]
    filterset_fields = ["program", "semester_label", "is_archived"]
    search_fields = ["code", "name", "description", "program"]

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self.request.user, "role", "student") != "lecturer":
            return qs.none()
        return qs.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CourseClassViewSet(viewsets.ModelViewSet):
    serializer_class = CourseClassSerializer
    permission_classes = [IsLecturer]
    filterset_fields = ["course", "classroom", "schedule_day", "is_active", "academic_year", "term"]
    search_fields = ["schedule_note"]

    def get_queryset(self):
        qs = CourseClass.objects.select_related("course", "classroom", "lecturer").prefetch_related("students")
        if getattr(self.request.user, "role", "student") != "lecturer":
            return qs.none()
        return qs.filter(lecturer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(lecturer=self.request.user)


class ClassSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ClassSessionSerializer
    permission_classes = [IsLecturer]
    filterset_fields = ["status", "classroom", "course_class"]
    search_fields = ["topic", "agenda"]
    ordering_fields = ["scheduled_start", "status", "created_at"]

    def get_queryset(self):
        qs = (
            ClassSession.objects.select_related(
                "course_class",
                "course_class__course",
                "course_class__lecturer",
                "classroom",
                "attendance_session",
                "quiz_session",
            )
            .prefetch_related("notes")
        )
        if getattr(self.request.user, "role", "student") != "lecturer":
            return qs.none()
        qs = qs.filter(course_class__lecturer=self.request.user)
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(scheduled_start__date__gte=self._parse_date(date_from))
        if date_to:
            qs = qs.filter(scheduled_start__date__lte=self._parse_date(date_to))
        return qs

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        session = self.get_object()
        if session.status == ClassSession.STATUS_LIVE:
            raise ValidationError("Sesi sudah berjalan.")
        session.mark_live()
        serializer = self.get_serializer(session)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        session = self.get_object()
        session.mark_ended()
        serializer = self.get_serializer(session)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="export")
    def export(self, request, pk=None):
        session = self.get_object()
        export_format = request.data.get("format", SessionExportJob.FORMAT_CSV).lower()
        if export_format not in {SessionExportJob.FORMAT_CSV, SessionExportJob.FORMAT_JSON}:
            raise ValidationError({"format": "Gunakan csv atau json."})

        job = SessionExportJob.objects.create(
            class_session=session,
            requested_by=request.user,
            export_format=export_format,
            status=SessionExportJob.STATUS_PROCESSING,
        )
        try:
            dataset = self._build_export_dataset(session)
            file_path, mime_type = self._write_export_file(session, dataset, export_format)
            job.status = SessionExportJob.STATUS_DONE
            job.file_path = file_path
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "file_path", "completed_at", "updated_at"])
            full_path = Path(settings.MEDIA_ROOT) / file_path
            return FileResponse(open(full_path, "rb"), as_attachment=True, filename=full_path.name, content_type=mime_type)
        except Exception as exc:
            job.status = SessionExportJob.STATUS_FAILED
            job.error_message = str(exc)
            job.save(update_fields=["status", "error_message", "updated_at"])
            raise

    def _parse_date(self, value: str):
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            raise ValidationError({"date": "Format tanggal tidak valid. Gunakan ISO date."})

    def _build_export_dataset(self, session: ClassSession):
        session_info = {
            "id": session.id,
            "topic": session.topic,
            "agenda": session.agenda,
            "status": session.status,
            "scheduled_start": session.scheduled_start.isoformat() if session.scheduled_start else None,
            "scheduled_end": session.scheduled_end.isoformat() if session.scheduled_end else None,
            "actual_start": session.actual_start.isoformat() if session.actual_start else None,
            "actual_end": session.actual_end.isoformat() if session.actual_end else None,
            "course_class": session.course_class_id,
            "course": session.course_class.course.name,
            "classroom": session.classroom.code if session.classroom else None,
        }
        attendance = []
        if session.attendance_session_id:
            records = AttendanceRecord.objects.filter(session_id=session.attendance_session_id).select_related("student")
            for rec in records:
                attendance.append(
                    {
                        "student_id": rec.student_id,
                        "student_email": rec.student.email,
                        "student_username": rec.student.username,
                        "recognized_label": rec.recognized_label,
                        "recognized_name": rec.recognized_name,
                        "recognized_nim": rec.recognized_nim,
                        "timestamp": rec.timestamp.isoformat(),
                    }
                )
        notes = list(session.notes.values("id", "status", "summary", "updated_at"))
        return {"session": session_info, "attendance": attendance, "notes": notes}

    def _write_export_file(self, session: ClassSession, dataset: dict, export_format: str):
        export_dir = Path(settings.MEDIA_ROOT) / "exports"
        export_dir.mkdir(parents=True, exist_ok=True)
        timestamp = timezone.now().strftime("%Y%m%d%H%M%S")
        if export_format == SessionExportJob.FORMAT_JSON:
            content = json.dumps(dataset, ensure_ascii=False, indent=2)
            filename = f"session_{session.id}_{timestamp}.json"
            mime_type = "application/json"
        else:
            content = self._render_csv(dataset)
            filename = f"session_{session.id}_{timestamp}.csv"
            mime_type = "text/csv"
        file_path = export_dir / filename
        file_path.write_text(content, encoding="utf-8")
        return str(file_path.relative_to(settings.MEDIA_ROOT)), mime_type

    def _render_csv(self, dataset: dict) -> str:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Session Metadata"])
        for key, value in dataset.get("session", {}).items():
            writer.writerow([key, value])
        writer.writerow([])
        writer.writerow(["Attendance Records"])
        writer.writerow([
            "student_id",
            "student_email",
            "student_username",
            "recognized_label",
            "recognized_name",
            "recognized_nim",
            "timestamp",
        ])
        for rec in dataset.get("attendance", []):
            writer.writerow([
                rec.get("student_id"),
                rec.get("student_email"),
                rec.get("student_username"),
                rec.get("recognized_label"),
                rec.get("recognized_name"),
                rec.get("recognized_nim"),
                rec.get("timestamp"),
            ])
        return buffer.getvalue()


class SessionNoteViewSet(viewsets.ModelViewSet):
    serializer_class = SessionNoteSerializer
    permission_classes = [IsLecturer]
    filterset_fields = ["class_session", "status"]
    search_fields = ["summary", "transcript"]

    def get_queryset(self):
        qs = SessionNote.objects.select_related("class_session", "class_session__course_class", "class_session__course_class__lecturer")
        if getattr(self.request.user, "role", "student") != "lecturer":
            return qs.none()
        return qs.filter(class_session__course_class__lecturer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(last_edited_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(last_edited_by=self.request.user)


class SessionExportJobViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SessionExportJobSerializer
    permission_classes = [IsLecturer]
    filterset_fields = ["status", "class_session", "export_format"]
    ordering_fields = ["requested_at", "status"]

    def get_queryset(self):
        qs = SessionExportJob.objects.select_related("class_session", "requested_by")
        if getattr(self.request.user, "role", "student") != "lecturer":
            return qs.none()
        return qs.filter(requested_by=self.request.user)
