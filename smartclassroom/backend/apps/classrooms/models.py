from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Classroom(TimeStampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_classrooms",
    )
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    capacity = models.PositiveIntegerField(default=0)
    facilities = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    allowed_lecturers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="classrooms_allowed",
    )
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="classrooms_joined",
    )

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class Course(TimeStampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses",
    )
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    credits = models.PositiveSmallIntegerField(default=0)
    program = models.CharField(max_length=120, blank=True)
    semester_label = models.CharField(max_length=30, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class CourseClass(TimeStampedModel):
    DAY_CHOICES = [
        ("mon", "Monday"),
        ("tue", "Tuesday"),
        ("wed", "Wednesday"),
        ("thu", "Thursday"),
        ("fri", "Friday"),
        ("sat", "Saturday"),
        ("sun", "Sunday"),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="classes")
    classroom = models.ForeignKey(
        Classroom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="course_classes",
    )
    lecturer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teaching_classes",
    )
    academic_year = models.CharField(max_length=20, blank=True)
    term = models.CharField(max_length=20, blank=True)
    schedule_day = models.CharField(max_length=5, choices=DAY_CHOICES, blank=True)
    schedule_start = models.TimeField(null=True, blank=True)
    schedule_end = models.TimeField(null=True, blank=True)
    max_students = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    schedule_note = models.CharField(max_length=255, blank=True)
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="course_classes_joined",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.course.code} - {self.academic_year or 'N/A'} {self.term or ''}".strip()


class ClassSession(TimeStampedModel):
    STATUS_PLANNED = "planned"
    STATUS_LIVE = "live"
    STATUS_ENDED = "ended"
    STATUS_CHOICES = [
        (STATUS_PLANNED, "Planned"),
        (STATUS_LIVE, "Live"),
        (STATUS_ENDED, "Ended"),
    ]

    course_class = models.ForeignKey(CourseClass, on_delete=models.CASCADE, related_name="sessions")
    classroom = models.ForeignKey(
        Classroom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessions",
    )
    topic = models.CharField(max_length=255, blank=True)
    agenda = models.TextField(blank=True)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    meeting_url = models.URLField(blank=True)
    attendance_session = models.ForeignKey(
        "accounts.AttendanceSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="class_sessions",
    )
    quiz_session = models.ForeignKey(
        "quiz_sessions.QuizSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="class_sessions",
    )

    class Meta:
        ordering = ["-scheduled_start", "-created_at"]

    def __str__(self) -> str:
        title = self.topic or self.course_class.course.name
        return f"Session {self.id} - {title}"

    def mark_live(self):
        self.status = self.STATUS_LIVE
        self.actual_start = self.actual_start or timezone.now()
        self.save(update_fields=["status", "actual_start", "updated_at"])

    def mark_ended(self):
        self.status = self.STATUS_ENDED
        self.actual_end = self.actual_end or timezone.now()
        self.save(update_fields=["status", "actual_end", "updated_at"])


class SessionNote(TimeStampedModel):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
    ]

    class_session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name="notes")
    transcript = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    source_url = models.URLField(blank=True)
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="edited_session_notes",
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"Note for session {self.class_session_id} ({self.status})"


class SessionExportJob(TimeStampedModel):
    FORMAT_CSV = "csv"
    FORMAT_JSON = "json"
    FORMAT_CHOICES = [(FORMAT_CSV, "CSV"), (FORMAT_JSON, "JSON")]

    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_DONE = "done"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_DONE, "Done"),
        (STATUS_FAILED, "Failed"),
    ]

    class_session = models.ForeignKey(ClassSession, on_delete=models.CASCADE, related_name="export_jobs")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="session_exports",
    )
    export_format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default=FORMAT_CSV)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    file_path = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    requested_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at"]

    def __str__(self) -> str:
        return f"Export {self.id} for session {self.class_session_id} ({self.status})"
