from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import AttendanceSession, AttendanceRecord
from .serializers import (
    AttendanceSessionSerializer,
    AttendanceSessionListSerializer,
    AttendanceSessionCreateSerializer,
    AttendanceRecordSerializer,
    StudentAttendanceHistorySerializer
)


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
        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
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
