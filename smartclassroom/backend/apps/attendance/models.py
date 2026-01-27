from django.db import models
from django.utils import timezone
import uuid


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
        # Mencegah duplikasi sesi untuk kelas yang sama di tanggal yang sama
        unique_together = ['course_code', 'class_name', 'date', 'lecturer_id']
    
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
