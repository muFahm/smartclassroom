from django.db import models
from django.utils import timezone
import uuid


# ==========================================
# Master Data Models (Cache dari SIS Trisakti)
# ==========================================

class SisCourse(models.Model):
    """
    Cache data Mata Kuliah dari SIS Trisakti API
    """
    id = models.CharField(max_length=50, primary_key=True, help_text="IdCourse dari SIS")
    code = models.CharField(max_length=50, help_text="Kode mata kuliah (KodeMk)")
    name = models.CharField(max_length=200, help_text="Nama mata kuliah")
    credits = models.PositiveSmallIntegerField(default=0, help_text="SKS")
    program = models.CharField(max_length=100, blank=True, default='', help_text="Program studi")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['code']
        verbose_name = 'SIS Course'
        verbose_name_plural = 'SIS Courses'
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class SisLecturer(models.Model):
    """
    Cache data Dosen dari SIS Trisakti API
    """
    id = models.CharField(max_length=50, primary_key=True, help_text="StaffId dari SIS")
    id_staff = models.IntegerField(null=True, blank=True, help_text="IdStaff (numeric) dari SIS")
    name = models.CharField(max_length=200, help_text="Nama lengkap dosen (StaffName)")
    photo_url = models.CharField(max_length=500, blank=True, default='', help_text="Path foto dosen")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'SIS Lecturer'
        verbose_name_plural = 'SIS Lecturers'
    
    def __str__(self):
        return f"{self.id} - {self.name}"


class SisStudent(models.Model):
    """
    Cache data Mahasiswa dari SIS Trisakti API
    """
    nim = models.CharField(max_length=50, primary_key=True, help_text="NIM mahasiswa")
    name = models.CharField(max_length=200, blank=True, default='', help_text="Nama mahasiswa")
    photo_url = models.CharField(max_length=500, blank=True, default='', help_text="Path foto mahasiswa")
    program = models.CharField(max_length=100, blank=True, default='', help_text="Program studi")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['nim']
        verbose_name = 'SIS Student'
        verbose_name_plural = 'SIS Students'
    
    def __str__(self):
        return f"{self.nim} - {self.name}" if self.name else self.nim


class SisCourseClass(models.Model):
    """
    Kelas per Mata Kuliah dari SIS Trisakti API
    """
    id = models.CharField(max_length=100, primary_key=True, help_text="Composite ID: IdCourse_KodeKelas")
    course = models.ForeignKey(SisCourse, on_delete=models.CASCADE, related_name='classes')
    class_code = models.CharField(max_length=20, help_text="Kode kelas (KodeKelas)")
    room = models.CharField(max_length=50, blank=True, default='', help_text="Ruangan (KodeRuang)")
    day = models.CharField(max_length=20, blank=True, default='', help_text="Hari kuliah")
    start_time = models.TimeField(null=True, blank=True, help_text="Jam mulai")
    end_time = models.TimeField(null=True, blank=True, help_text="Jam selesai")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['course__code', 'class_code']
        verbose_name = 'SIS Course Class'
        verbose_name_plural = 'SIS Course Classes'
    
    def __str__(self):
        return f"{self.course.code} - Kelas {self.class_code}"


class SisCourseClassLecturer(models.Model):
    """
    Relasi Many-to-Many antara Kelas dan Dosen
    """
    course_class = models.ForeignKey(SisCourseClass, on_delete=models.CASCADE, related_name='lecturers')
    lecturer = models.ForeignKey(SisLecturer, on_delete=models.CASCADE, related_name='course_classes')
    
    class Meta:
        unique_together = ['course_class', 'lecturer']
        verbose_name = 'Course Class Lecturer'
        verbose_name_plural = 'Course Class Lecturers'
    
    def __str__(self):
        return f"{self.course_class} - {self.lecturer.name}"


class SisEnrollment(models.Model):
    """
    Relasi Mahasiswa - Kelas (KRS)
    """
    course_class = models.ForeignKey(SisCourseClass, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(SisStudent, on_delete=models.CASCADE, related_name='enrollments')
    
    class Meta:
        unique_together = ['course_class', 'student']
        verbose_name = 'SIS Enrollment'
        verbose_name_plural = 'SIS Enrollments'
    
    def __str__(self):
        return f"{self.student.nim} enrolled in {self.course_class}"


# ==========================================
# Attendance Models
# ==========================================


class AttendanceSession(models.Model):
    """
    Model untuk menyimpan sesi absensi per pertemuan
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Informasi Mata Kuliah (dari SIS Trisakti API)
    course_id = models.CharField(max_length=50, help_text="ID mata kuliah dari SIS (IdCourse)", default='')
    course_code = models.CharField(max_length=50, help_text="Kode mata kuliah (KodeMk)")
    course_name = models.CharField(max_length=200, help_text="Nama mata kuliah")
    class_name = models.CharField(max_length=50, help_text="Nama kelas (e.g., IF-A)")
    
    # Informasi Dosen
    lecturer_id = models.CharField(max_length=50, help_text="ID dosen dari SIS")
    lecturer_name = models.CharField(max_length=200, help_text="Nama dosen")
    
    # Informasi Sesi
    date = models.DateField(help_text="Tanggal perkuliahan")
    day_name = models.CharField(max_length=20, help_text="Nama hari")
    start_time = models.TimeField(null=True, blank=True, help_text="Jam mulai")
    end_time = models.TimeField(null=True, blank=True, help_text="Jam selesai")
    
    # Status sesi
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = 'Attendance Session'
        verbose_name_plural = 'Attendance Sessions'
        # Removed unique_together to allow multiple sessions per day
    
    def __str__(self):
        return f"{self.course_name} - {self.class_name} ({self.date})"
    
    def complete_session(self):
        """Mark session as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    @property
    def total_students(self):
        return self.records.count()
    
    @property
    def present_count(self):
        return self.records.filter(status='hadir').count()
    
    @property
    def sick_count(self):
        return self.records.filter(status='sakit').count()
    
    @property
    def izin_count(self):
        return self.records.filter(status='izin').count()
    
    @property
    def permission_count(self):
        return self.records.filter(status='dispensasi').count()
    
    @property
    def absent_count(self):
        return self.records.filter(status='alpha').count()


class AttendanceRecord(models.Model):
    """
    Model untuk menyimpan record absensi per mahasiswa per sesi
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relasi ke sesi
    session = models.ForeignKey(
        AttendanceSession, 
        on_delete=models.CASCADE, 
        related_name='records'
    )
    
    # Informasi Mahasiswa (dari SIS Trisakti API)
    student_id = models.CharField(max_length=50, help_text="NIM mahasiswa")
    student_name = models.CharField(max_length=200, help_text="Nama mahasiswa")
    student_photo_url = models.URLField(blank=True, default='', help_text="URL foto mahasiswa")
    
    # Status kehadiran
    STATUS_CHOICES = (
        ('hadir', 'Hadir'),
        ('sakit', 'Sakit'),
        ('izin', 'Izin'),
        ('dispensasi', 'Dispensasi'),
        ('alpha', 'Alpha'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='alpha')
    
    # Face recognition info
    face_recognized = models.BooleanField(default=False, help_text="Apakah wajah dikenali oleh sistem")
    recognized_at = models.DateTimeField(null=True, blank=True, help_text="Waktu wajah dikenali")
    confidence_score = models.FloatField(null=True, blank=True, help_text="Skor confidence face recognition")
    
    # Notes
    notes = models.TextField(blank=True, default='', help_text="Catatan tambahan")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['student_name']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
        # Mencegah duplikasi record untuk mahasiswa yang sama di sesi yang sama
        unique_together = ['session', 'student_id']
    
    def __str__(self):
        return f"{self.student_name} ({self.student_id}) - {self.status}"
    
    def mark_present_by_face(self, confidence_score=None):
        """Mark as present via face recognition"""
        self.status = 'hadir'
        self.face_recognized = True
        self.recognized_at = timezone.now()
        if confidence_score:
            self.confidence_score = confidence_score
        self.save()


class BiometricRegistration(models.Model):
    """
    Model untuk menyimpan registrasi biometrik mahasiswa (wajah + suara)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        SisStudent,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='biometric_registrations'
    )
    student_nim = models.CharField(max_length=50, help_text="NIM mahasiswa")
    student_name = models.CharField(max_length=200, blank=True, default='', help_text="Nama mahasiswa")

    lecturer_id = models.CharField(max_length=50, blank=True, default='', help_text="ID dosen (opsional)")
    lecturer_name = models.CharField(max_length=200, blank=True, default='', help_text="Nama dosen (opsional)")

    face_front = models.TextField(blank=True, default='', help_text="Base64 foto wajah depan")
    face_left = models.TextField(blank=True, default='', help_text="Base64 foto wajah kiri")
    face_right = models.TextField(blank=True, default='', help_text="Base64 foto wajah kanan")
    face_up = models.TextField(blank=True, default='', help_text="Base64 foto wajah atas")

    face_front_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')
    face_left_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')
    face_right_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')
    face_up_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')

    voice_prompt_1_text = models.TextField(blank=True, default='')
    voice_prompt_2_text = models.TextField(blank=True, default='')
    voice_recording_1 = models.TextField(blank=True, default='', help_text="Base64 audio rekaman 1")
    voice_recording_2 = models.TextField(blank=True, default='', help_text="Base64 audio rekaman 2")
    voice_recording_1_mime = models.CharField(max_length=50, blank=True, default='audio/webm')
    voice_recording_2_mime = models.CharField(max_length=50, blank=True, default='audio/webm')
    voice_recording_1_duration = models.FloatField(null=True, blank=True)
    voice_recording_2_duration = models.FloatField(null=True, blank=True)

    is_complete = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Biometric Registration'
        verbose_name_plural = 'Biometric Registrations'

    def __str__(self):
        return f"{self.student_nim} - Biometric Registration"


class BiometricFaceDataset(models.Model):
    """
    Dataset wajah mahasiswa (disimpan terpisah)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        SisStudent,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='face_datasets'
    )
    student_nim = models.CharField(max_length=50, help_text="NIM mahasiswa")
    student_name = models.CharField(max_length=200, blank=True, default='', help_text="Nama mahasiswa")

    face_front = models.TextField(blank=True, default='', help_text="Base64 foto wajah depan")
    face_left = models.TextField(blank=True, default='', help_text="Base64 foto wajah kiri")
    face_right = models.TextField(blank=True, default='', help_text="Base64 foto wajah kanan")
    face_up = models.TextField(blank=True, default='', help_text="Base64 foto wajah atas")

    face_front_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')
    face_left_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')
    face_right_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')
    face_up_mime = models.CharField(max_length=50, blank=True, default='image/jpeg')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Biometric Face Dataset'
        verbose_name_plural = 'Biometric Face Datasets'

    def __str__(self):
        return f"{self.student_nim} - Face Dataset"


class BiometricVoiceDataset(models.Model):
    """
    Dataset suara mahasiswa (disimpan terpisah)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        SisStudent,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='voice_datasets'
    )
    student_nim = models.CharField(max_length=50, help_text="NIM mahasiswa")
    student_name = models.CharField(max_length=200, blank=True, default='', help_text="Nama mahasiswa")

    voice_prompt_1_text = models.TextField(blank=True, default='')
    voice_prompt_2_text = models.TextField(blank=True, default='')
    voice_recording_1 = models.TextField(blank=True, default='', help_text="Base64 audio rekaman 1")
    voice_recording_2 = models.TextField(blank=True, default='', help_text="Base64 audio rekaman 2")
    voice_recording_1_mime = models.CharField(max_length=50, blank=True, default='audio/webm')
    voice_recording_2_mime = models.CharField(max_length=50, blank=True, default='audio/webm')
    voice_recording_1_duration = models.FloatField(null=True, blank=True)
    voice_recording_2_duration = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Biometric Voice Dataset'
        verbose_name_plural = 'Biometric Voice Datasets'

    def __str__(self):
        return f"{self.student_nim} - Voice Dataset"
