from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import date, timedelta
from .models import (
    AttendanceSession, AttendanceRecord,
    SisCourse, SisLecturer, SisStudent, SisCourseClass, SisEnrollment,
    BiometricRegistration, BiometricFaceDataset, BiometricVoiceDataset
)
from .serializers import (
    AttendanceSessionSerializer,
    AttendanceSessionListSerializer,
    AttendanceSessionCreateSerializer,
    AttendanceRecordSerializer,
    StudentAttendanceHistorySerializer,
    StudentEnrollmentSerializer,
    StudentCourseAttendanceSerializer,
    BiometricRegistrationSerializer,
    BiometricFaceDatasetSerializer,
    BiometricVoiceDatasetSerializer
)


# ==========================================
# Semester Schedule Settings (Ganjil 2025)
# ==========================================

SEMESTER_GANJIL_2025_START = date(2025, 9, 8)  # Minggu ke-2, 8 Sept 2025
SEMESTER_MEETINGS_COUNT = 17

_DAY_NAME_TO_INDEX = {
    "monday": 0,
    "mon": 0,
    "senin": 0,
    "tuesday": 1,
    "tue": 1,
    "selasa": 1,
    "wednesday": 2,
    "wed": 2,
    "rabu": 2,
    "thursday": 3,
    "thu": 3,
    "kamis": 3,
    "friday": 4,
    "fri": 4,
    "jumat": 4,
    "saturday": 5,
    "sat": 5,
    "sabtu": 5,
    "sunday": 6,
    "sun": 6,
    "minggu": 6,
}


def _get_weekday_index(day_name: str):
    if not day_name:
        return None
    return _DAY_NAME_TO_INDEX.get(day_name.strip().lower())


def _build_semester_meeting_dates(day_name: str):
    """Generate 17 weekly meeting dates starting from Sep 8, 2025 (week 2)."""
    target_idx = _get_weekday_index(day_name)
    if target_idx is None:
        first_date = SEMESTER_GANJIL_2025_START
    else:
        offset = (target_idx - SEMESTER_GANJIL_2025_START.weekday()) % 7
        first_date = SEMESTER_GANJIL_2025_START + timedelta(days=offset)

    return [first_date + timedelta(days=7 * i) for i in range(SEMESTER_MEETINGS_COUNT)]


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk mengelola sesi absensi
    """
    queryset = AttendanceSession.objects.all()
    permission_classes = [AllowAny]  # TODO: Ganti ke IsAuthenticated untuk production
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AttendanceSessionListSerializer
        elif self.action == 'create':
            return AttendanceSessionCreateSerializer
        return AttendanceSessionSerializer
    
    def get_queryset(self):
        queryset = AttendanceSession.objects.all()
        
        # Filter by lecturer_id
        lecturer_id = self.request.query_params.get('lecturer_id')
        if lecturer_id:
            queryset = queryset.filter(lecturer_id=lecturer_id)
        
        # Filter by course_id (IdCourse from SIS)
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # Filter by course_code (KodeMk)
        course_code = self.request.query_params.get('course_code')
        if course_code:
            queryset = queryset.filter(course_code=course_code)
        
        # Filter by class_name
        class_name = self.request.query_params.get('class_name')
        if class_name:
            queryset = queryset.filter(class_name=class_name)
        
        # Filter by date
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = serializer.save()
        
        # Return full session data with records
        response_serializer = AttendanceSessionSerializer(session)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete an attendance session"""
        session = self.get_object()
        session.complete_session()
        serializer = AttendanceSessionSerializer(session)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an attendance session"""
        session = self.get_object()
        session.status = 'cancelled'
        session.save()
        serializer = AttendanceSessionSerializer(session)
        return Response(serializer.data)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk mengelola record absensi individual
    """
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [AllowAny]  # TODO: Ganti ke IsAuthenticated untuk production
    
    def get_queryset(self):
        queryset = AttendanceRecord.objects.all()
        
        # Filter by session
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        # Filter by student_id
        student_nim = self.request.query_params.get('student_nim')
        if student_nim:
            queryset = queryset.filter(student_nim=student_nim)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update attendance status for a record"""
        record = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['hadir', 'sakit', 'dispensasi', 'alpha']:
            return Response(
                {'error': 'Invalid status. Must be one of: hadir, sakit, dispensasi, alpha'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        record.status = new_status
        record.save()
        
        serializer = AttendanceRecordSerializer(record)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def face_recognition(self, request, pk=None):
        """Mark student as present via face recognition"""
        record = self.get_object()
        confidence_score = request.data.get('confidence_score')
        
        record.mark_present_by_face(confidence_score)
        
        serializer = AttendanceRecordSerializer(record)
        return Response(serializer.data)


class BiometricRegistrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk registrasi biometrik mahasiswa (wajah + suara)
    """
    queryset = BiometricRegistration.objects.all()
    serializer_class = BiometricRegistrationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = BiometricRegistration.objects.all()

        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        lecturer_id = self.request.query_params.get('lecturer_id')
        if lecturer_id:
            queryset = queryset.filter(lecturer_id=lecturer_id)

        return queryset


class BiometricFaceDatasetViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk dataset wajah mahasiswa
    """
    queryset = BiometricFaceDataset.objects.all()
    serializer_class = BiometricFaceDatasetSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = BiometricFaceDataset.objects.all()

        student_nim = self.request.query_params.get('student_nim')
        if student_nim:
            queryset = queryset.filter(student_nim=student_nim)

        return queryset


class BiometricVoiceDatasetViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk dataset suara mahasiswa
    """
    queryset = BiometricVoiceDataset.objects.all()
    serializer_class = BiometricVoiceDatasetSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = BiometricVoiceDataset.objects.all()

        student_nim = self.request.query_params.get('student_nim')
        if student_nim:
            queryset = queryset.filter(student_nim=student_nim)

        return queryset


@api_view(['GET'])
@permission_classes([AllowAny])
def student_attendance_history(request, student_id):
    """
    Get attendance history for a specific student
    Endpoint untuk mahasiswa melihat riwayat absensi mereka
    """
    records = AttendanceRecord.objects.filter(
        student_id=student_id,
        session__status='completed'
    ).select_related('session').order_by('-session__date')
    
    # Optional filters
    course_code = request.query_params.get('course_code')
    if course_code:
        records = records.filter(session__course_code=course_code)
    
    serializer = StudentAttendanceHistorySerializer(records, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def student_attendance_summary(request, student_id):
    """
    Get attendance summary for a specific student
    Returns counts of each status type
    """
    records = AttendanceRecord.objects.filter(
        student_id=student_id,
        session__status='completed'
    )
    
    # Optional filter by course
    course_code = request.query_params.get('course_code')
    if course_code:
        records = records.filter(session__course_code=course_code)
    
    summary = {
        'total': records.count(),
        'hadir': records.filter(status='hadir').count(),
        'sakit': records.filter(status='sakit').count(),
        'dispensasi': records.filter(status='dispensasi').count(),
        'alpha': records.filter(status='alpha').count(),
    }
    
    # Calculate percentage
    if summary['total'] > 0:
        summary['attendance_percentage'] = round(
            (summary['hadir'] / summary['total']) * 100, 2
        )
    else:
        summary['attendance_percentage'] = 0
    
    return Response(summary)


@api_view(['POST'])
@permission_classes([AllowAny])
def bulk_update_attendance(request, session_id):
    """
    Bulk update attendance status for multiple students in a session
    Useful for updating all students at once when session is completed
    """
    session = get_object_or_404(AttendanceSession, pk=session_id)
    updates = request.data.get('updates', [])
    
    if not updates:
        return Response(
            {'error': 'No updates provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    updated_records = []
    errors = []
    
    for update in updates:
        student_id = update.get('student_id')
        new_status = update.get('status')
        
        if not student_id or not new_status:
            errors.append({'error': 'Missing student_id or status', 'data': update})
            continue
        
        if new_status not in ['hadir', 'sakit', 'dispensasi', 'alpha']:
            errors.append({'error': f'Invalid status: {new_status}', 'student_id': student_id})
            continue
        
        try:
            record = AttendanceRecord.objects.get(
                session=session,
                student_id=student_id
            )
            record.status = new_status
            if update.get('notes'):
                record.notes = update.get('notes')
            record.save()
            updated_records.append(student_id)
        except AttendanceRecord.DoesNotExist:
            errors.append({'error': 'Record not found', 'student_id': student_id})
    
    return Response({
        'updated': updated_records,
        'errors': errors,
        'total_updated': len(updated_records)
    })


# ==========================================
# Student Enrollment & Attendance Endpoints
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny])
def student_enrollments(request, nim):
    """
    Get list of courses a student is enrolled in this semester
    Returns courses from SisEnrollment table
    """
    # Get enrollments for this student
    enrollments = SisEnrollment.objects.filter(
        student__nim=nim
    ).select_related('course_class', 'course_class__course')
    
    if not enrollments.exists():
        # Student not found in enrollment, return empty list
        return Response({
            'nim': nim,
            'enrollments': [],
            'message': 'No enrollments found for this student'
        })
    
    serializer = StudentEnrollmentSerializer(enrollments, many=True)
    return Response({
        'nim': nim,
        'enrollments': serializer.data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def student_course_attendance(request, nim, course_id):
    """
    Get attendance history for a student in a specific course
    Returns 17 meeting slots with attendance status
    """
    # Get all attendance records for this student in this course
    records = AttendanceRecord.objects.filter(
        student_id=nim,
        session__course_id=course_id,
        session__status='completed'
    ).select_related('session').order_by('session__date')
    
    # Get course info
    course = SisCourse.objects.filter(id=course_id).first()
    if not course:
        # Try to get from session if course not in SIS table
        first_record = records.first()
        if first_record:
            course_code = first_record.session.course_code
            course_name = first_record.session.course_name
        else:
            return Response({
                'error': 'Course not found'
            }, status=status.HTTP_404_NOT_FOUND)
    else:
        course_code = course.code
        course_name = course.name
    
    # Get class code and day from enrollment
    enrollment = SisEnrollment.objects.filter(
        student__nim=nim,
        course_class__course__id=course_id
    ).select_related("course_class").first()
    class_code = enrollment.course_class.class_code if enrollment else ''
    class_day = enrollment.course_class.day if enrollment else ''

    # Build 17 meeting slots based on fixed semester start (Sep 8, 2025)
    meetings = []
    summary = {
        'hadir': 0,
        'sakit': 0,
        'izin': 0,
        'dispensasi': 0,
        'alpha': 0,
        'belum': 0
    }

    # Map existing records by date
    record_map = {}
    for record in records:
        record_map[record.session.date] = {
            'date': record.session.date,
            'status': record.status,
            'day_name': record.session.day_name,
            'session_id': str(record.session.id),
            'face_recognized': record.face_recognized,
            'notes': record.notes
        }
        if record.status in summary:
            summary[record.status] += 1

    meeting_dates = _build_semester_meeting_dates(class_day)

    for i, meeting_date in enumerate(meeting_dates, start=1):
        record = record_map.get(meeting_date)
        if record:
            meeting = record.copy()
            meeting['meeting_number'] = i
            meeting['attended'] = True
            meetings.append(meeting)
        else:
            meetings.append({
                'meeting_number': i,
                'attended': False,
                'status': None,
                'date': meeting_date,
                'day_name': class_day or None
            })
            summary['belum'] += 1
    
    return Response({
        'nim': nim,
        'course_id': course_id,
        'course_code': course_code,
        'course_name': course_name,
        'class_code': class_code,
        'meetings': meetings,
        'summary': summary,
        'total_attended': len(record_map)
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def student_all_courses_attendance(request, nim):
    """
    Get attendance summary for all courses a student is enrolled in
    """
    # Get all enrollments
    enrollments = SisEnrollment.objects.filter(
        student__nim=nim
    ).select_related('course_class', 'course_class__course')
    
    courses_attendance = []
    
    for enrollment in enrollments:
        course = enrollment.course_class.course
        
        # Get attendance records for this course
        records = AttendanceRecord.objects.filter(
            student_id=nim,
            session__course_id=course.id,
            session__status='completed'
        )
        
        # Count by status
        summary = {
            'hadir': records.filter(status='hadir').count(),
            'sakit': records.filter(status='sakit').count(),
            'izin': records.filter(status='izin').count(),
            'dispensasi': records.filter(status='dispensasi').count(),
            'alpha': records.filter(status='alpha').count(),
        }
        summary['total'] = sum(summary.values())
        
        # Calculate attendance percentage
        if summary['total'] > 0:
            summary['attendance_percentage'] = round(
                (summary['hadir'] / summary['total']) * 100, 1
            )
        else:
            summary['attendance_percentage'] = 0
        
        courses_attendance.append({
            'course_id': course.id,
            'course_code': course.code,
            'course_name': course.name,
            'class_code': enrollment.course_class.class_code,
            'day': enrollment.course_class.day,
            'start_time': str(enrollment.course_class.start_time) if enrollment.course_class.start_time else None,
            'end_time': str(enrollment.course_class.end_time) if enrollment.course_class.end_time else None,
            'summary': summary
        })
    
    return Response({
        'nim': nim,
        'courses': courses_attendance
    })
