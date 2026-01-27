from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for AttendanceRecord model"""
    
    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'session', 'student_id', 'student_name', 'student_photo_url',
            'status', 'face_recognized', 'recognized_at', 'confidence_score',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttendanceRecordCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AttendanceRecord (without session)"""
    
    class Meta:
        model = AttendanceRecord
        fields = [
            'student_id', 'student_name', 'student_photo_url', 'status',
            'face_recognized', 'recognized_at', 'confidence_score', 'notes'
        ]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    """Serializer for AttendanceSession model"""
    records = AttendanceRecordSerializer(many=True, read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    present_count = serializers.IntegerField(read_only=True)
    sick_count = serializers.IntegerField(read_only=True)
    permission_count = serializers.IntegerField(read_only=True)
    absent_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'course_id', 'course_code', 'course_name', 'class_name',
            'lecturer_id', 'lecturer_name', 'date', 'day_name',
            'start_time', 'end_time', 'status', 'created_at', 
            'updated_at', 'completed_at', 'records',
            'total_students', 'present_count', 'sick_count', 
            'permission_count', 'absent_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class AttendanceSessionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing sessions (without records)"""
    total_students = serializers.IntegerField(read_only=True)
    present_count = serializers.IntegerField(read_only=True)
    sick_count = serializers.IntegerField(read_only=True)
    permission_count = serializers.IntegerField(read_only=True)
    absent_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'course_id', 'course_code', 'course_name', 'class_name',
            'lecturer_id', 'lecturer_name', 'date', 'day_name',
            'start_time', 'end_time', 'status', 'created_at', 
            'completed_at', 'total_students', 'present_count', 
            'sick_count', 'permission_count', 'absent_count'
        ]


class AttendanceSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AttendanceSession with records"""
    students = AttendanceRecordCreateSerializer(many=True, write_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = [
            'course_id', 'course_code', 'course_name', 'class_name',
            'lecturer_id', 'lecturer_name', 'date', 'day_name',
            'start_time', 'end_time', 'students'
        ]
    
    def create(self, validated_data):
        students_data = validated_data.pop('students', [])
        
        # Create session
        session = AttendanceSession.objects.create(**validated_data)
        
        # Create attendance records for each student
        for student_data in students_data:
            AttendanceRecord.objects.create(session=session, **student_data)
        
        return session


class StudentAttendanceHistorySerializer(serializers.ModelSerializer):
    """Serializer untuk riwayat absensi mahasiswa"""
    course_code = serializers.CharField(source='session.course_code')
    course_name = serializers.CharField(source='session.course_name')
    class_name = serializers.CharField(source='session.class_name')
    lecturer_name = serializers.CharField(source='session.lecturer_name')
    date = serializers.DateField(source='session.date')
    day_name = serializers.CharField(source='session.day_name')
    
    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'course_code', 'course_name', 'class_name',
            'lecturer_name', 'date', 'day_name', 'status',
            'face_recognized', 'recognized_at', 'notes'
        ]
