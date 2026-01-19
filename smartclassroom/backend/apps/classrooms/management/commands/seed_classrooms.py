from datetime import timedelta, time

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import AttendanceRecord, AttendanceSession, CustomUser
from apps.classrooms.models import Classroom, Course, CourseClass, ClassSession, SessionNote


class Command(BaseCommand):
    help = "Seed dummy classrooms, courses, sessions, attendance, and notes for dashboards."

    def handle(self, *args, **options):
        lecturer = self._get_or_create_lecturer()
        students = self._ensure_students()
        classrooms = self._create_classrooms(lecturer)
        courses = self._create_courses(lecturer)
        course_classes = self._create_course_classes(lecturer, classrooms, courses)
        self._create_sessions_with_attendance(lecturer, students, course_classes)
        self.stdout.write(self.style.SUCCESS("Dummy classroom data created."))

    def _get_or_create_lecturer(self):
        lecturer, _ = CustomUser.objects.get_or_create(
            email="lecturer@class.local",
            defaults={
                "username": "lecturer",
                "role": "lecturer",
                "password": "lecturer123",
            },
        )
        if not lecturer.has_usable_password():
            lecturer.set_password("lecturer123")
            lecturer.save(update_fields=["password"])
        return lecturer

    def _ensure_students(self):
        students = []
        for idx in range(1, 6):
            email = f"student{idx}@class.local"
            user, _ = CustomUser.objects.get_or_create(
                email=email,
                defaults={"username": f"student{idx}", "role": "student", "password": "student123"},
            )
            if not user.has_usable_password():
                user.set_password("student123")
                user.save(update_fields=["password"])
            students.append(user)
        return students

    def _create_classrooms(self, lecturer):
        data = [
            {"code": "R101", "name": "Ruang 101", "location": "Gedung A", "capacity": 40},
            {"code": "R201", "name": "Ruang 201", "location": "Gedung B", "capacity": 50},
            {"code": "LAB-AI", "name": "Lab AI", "location": "Gedung Lab", "capacity": 25},
        ]
        classrooms = []
        for item in data:
            room, _ = Classroom.objects.get_or_create(code=item["code"], defaults={**item, "owner": lecturer})
            room.allowed_lecturers.add(lecturer)
            classrooms.append(room)
        return classrooms

    def _create_courses(self, lecturer):
        entries = [
            {"code": "CS101", "name": "Pengantar CS", "credits": 3, "program": "CS"},
            {"code": "AI201", "name": "Kecerdasan Buatan", "credits": 3, "program": "CS"},
        ]
        courses = []
        for item in entries:
            course, _ = Course.objects.get_or_create(code=item["code"], defaults={**item, "owner": lecturer})
            courses.append(course)
        return courses

    def _create_course_classes(self, lecturer, classrooms, courses):
        course_classes = []
        mapping = [
            {"course": courses[0], "classroom": classrooms[0], "day": "mon", "start": time(8, 0), "end": time(9, 40)},
            {"course": courses[0], "classroom": classrooms[1], "day": "wed", "start": time(10, 0), "end": time(11, 40)},
            {"course": courses[1], "classroom": classrooms[2], "day": "fri", "start": time(13, 0), "end": time(15, 0)},
        ]
        for idx, item in enumerate(mapping, start=1):
            cc, _ = CourseClass.objects.get_or_create(
                course=item["course"],
                classroom=item["classroom"],
                lecturer=lecturer,
                academic_year="2024/2025",
                term="genap",
                schedule_day=item["day"],
                schedule_start=item["start"],
                schedule_end=item["end"],
                defaults={"schedule_note": f"Kelas {idx}"},
            )
            course_classes.append(cc)
        return course_classes

    def _create_sessions_with_attendance(self, lecturer, students, course_classes):
        now = timezone.now()
        for idx, cc in enumerate(course_classes):
            # One past session
            past_start = now - timedelta(days=idx + 7)
            past_session, _ = ClassSession.objects.get_or_create(
                course_class=cc,
                scheduled_start=past_start,
                scheduled_end=past_start + timedelta(hours=2),
                defaults={"status": ClassSession.STATUS_ENDED, "classroom": cc.classroom, "topic": "Review"},
            )
            past_session.actual_start = past_session.scheduled_start
            past_session.actual_end = past_session.scheduled_end
            past_session.status = ClassSession.STATUS_ENDED
            past_session.save(update_fields=["actual_start", "actual_end", "status", "updated_at"])

            attendance_session = AttendanceSession.objects.create(host=lecturer, name=f"Attendance {past_session.id}", is_active=False)
            past_session.attendance_session = attendance_session
            past_session.save(update_fields=["attendance_session", "updated_at"])
            for student in students:
                AttendanceRecord.objects.get_or_create(
                    session=attendance_session,
                    student=student,
                    defaults={
                        "recognized_label": student.username,
                        "recognized_name": student.username,
                        "recognized_nim": f"NIM{student.id:04d}",
                    },
                )
            SessionNote.objects.get_or_create(
                class_session=past_session,
                defaults={
                    "summary": "Ringkasan dummy untuk sesi sebelumnya.",
                    "transcript": "Lorem ipsum dolor sit amet...",
                    "status": SessionNote.STATUS_DRAFT,
                    "last_edited_by": lecturer,
                },
            )

            # One upcoming session
            upcoming_start = now + timedelta(days=idx + 1)
            ClassSession.objects.get_or_create(
                course_class=cc,
                scheduled_start=upcoming_start,
                scheduled_end=upcoming_start + timedelta(hours=2),
                defaults={
                    "status": ClassSession.STATUS_PLANNED,
                    "classroom": cc.classroom,
                    "topic": f"Pertemuan {idx + 1}",
                    "agenda": "Agenda placeholder",
                },
            )

