from rest_framework import serializers
from .models import (
    AttendanceSession, AttendanceRecord,
    SisCourse, SisLecturer, SisStudent, SisCourseClass, SisEnrollment,
    BiometricRegistration, BiometricFaceDataset, BiometricVoiceDataset
)


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
    izin_count = serializers.IntegerField(read_only=True)
    permission_count = serializers.IntegerField(read_only=True)
    absent_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'course_id', 'course_code', 'course_name', 'class_name',
            'lecturer_id', 'lecturer_name', 'date', 'day_name',
            'start_time', 'end_time', 'status', 'created_at', 
            'updated_at', 'completed_at', 'records',
            'total_students', 'present_count', 'sick_count', 'izin_count',
            'permission_count', 'absent_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class AttendanceSessionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing sessions (without records)"""
    total_students = serializers.IntegerField(read_only=True)
    present_count = serializers.IntegerField(read_only=True)
    sick_count = serializers.IntegerField(read_only=True)
    izin_count = serializers.IntegerField(read_only=True)
    permission_count = serializers.IntegerField(read_only=True)
    absent_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'course_id', 'course_code', 'course_name', 'class_name',
            'lecturer_id', 'lecturer_name', 'date', 'day_name',
            'start_time', 'end_time', 'status', 'created_at', 
            'completed_at', 'total_students', 'present_count', 
            'sick_count', 'izin_count', 'permission_count', 'absent_count'
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


# ==========================================
# SIS Data Serializers
# ==========================================

class SisCourseSerializer(serializers.ModelSerializer):
    """Serializer for SIS Course"""
    class Meta:
        model = SisCourse
        fields = ['id', 'code', 'name', 'credits', 'program']


class SisLecturerSerializer(serializers.ModelSerializer):
    """Serializer for SIS Lecturer"""
    class Meta:
        model = SisLecturer
        fields = ['id', 'name', 'photo_url']


class SisCourseClassSerializer(serializers.ModelSerializer):
    """Serializer for SIS Course Class"""
    course = SisCourseSerializer(read_only=True)
    
    class Meta:
        model = SisCourseClass
        fields = ['id', 'course', 'class_code', 'day', 'room', 'start_time', 'end_time']


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer untuk daftar mata kuliah yang diikuti mahasiswa"""
    course_id = serializers.CharField(source='course_class.course.id')
    course_code = serializers.CharField(source='course_class.course.code')
    course_name = serializers.CharField(source='course_class.course.name')
    class_code = serializers.CharField(source='course_class.class_code')
    day = serializers.CharField(source='course_class.day')
    room = serializers.CharField(source='course_class.room')
    start_time = serializers.TimeField(source='course_class.start_time')
    end_time = serializers.TimeField(source='course_class.end_time')
    
    class Meta:
        model = SisEnrollment
        fields = [
            'id', 'course_id', 'course_code', 'course_name', 
            'class_code', 'day', 'room', 'start_time', 'end_time'
        ]


class StudentCourseAttendanceSerializer(serializers.Serializer):
    """Serializer untuk riwayat absensi per mata kuliah dengan 17 pertemuan"""
    course_id = serializers.CharField()
    course_code = serializers.CharField()
    course_name = serializers.CharField()
    class_code = serializers.CharField()
    meetings = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of 17 meetings with attendance status"
    )
    summary = serializers.DictField(
        help_text="Summary counts: hadir, sakit, izin, dispensasi, alpha"
    )


# ==========================================
# Biometric Registration
# ==========================================

class BiometricRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for BiometricRegistration model"""

    class Meta:
        model = BiometricRegistration
        fields = [
            'id', 'student', 'student_nim', 'student_name',
            'lecturer_id', 'lecturer_name',
            'face_front', 'face_left', 'face_right', 'face_up',
            'face_front_mime', 'face_left_mime', 'face_right_mime', 'face_up_mime',
            'voice_prompt_1_text', 'voice_prompt_2_text',
            'voice_recording_1', 'voice_recording_2',
            'voice_recording_1_mime', 'voice_recording_2_mime',
            'voice_recording_1_duration', 'voice_recording_2_duration',
            'is_complete', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_complete']

    def validate(self, attrs):
        required_fields = [
            'student_nim',
            'face_front', 'face_left', 'face_right', 'face_up',
            'voice_recording_1', 'voice_recording_2'
        ]
        missing = [field for field in required_fields if not attrs.get(field)]
        if missing:
            raise serializers.ValidationError({
                'missing_fields': missing,
                'message': 'Lengkapi seluruh data wajah dan suara.'
            })

        student_nim = attrs.get('student_nim')
        if student_nim and not attrs.get('student'):
            student = SisStudent.objects.filter(nim=student_nim).first()
            if student:
                attrs['student'] = student

        return attrs

    def create(self, validated_data):
        validated_data['is_complete'] = True
        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.is_complete = all([
            instance.face_front, instance.face_left, instance.face_right, instance.face_up,
            instance.voice_recording_1, instance.voice_recording_2,
        ])
        instance.save(update_fields=['is_complete'])
        return instance


class BiometricFaceDatasetSerializer(serializers.ModelSerializer):
    """Serializer for BiometricFaceDataset model"""

    class Meta:
        model = BiometricFaceDataset
        fields = [
            'id', 'student', 'student_nim', 'student_name',
            'face_front', 'face_left', 'face_right', 'face_up',
            'face_front_mime', 'face_left_mime', 'face_right_mime', 'face_up_mime',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        required_fields = ['student_nim', 'face_front', 'face_left', 'face_right', 'face_up']
        missing = [field for field in required_fields if not attrs.get(field)]
        if missing:
            raise serializers.ValidationError({
                'missing_fields': missing,
                'message': 'Lengkapi 4 foto wajah sebelum menyimpan.'
            })

        student_nim = attrs.get('student_nim')
        if student_nim and not attrs.get('student'):
            student = SisStudent.objects.filter(nim=student_nim).first()
            if student:
                attrs['student'] = student

        return attrs


class BiometricVoiceDatasetSerializer(serializers.ModelSerializer):
    """Serializer for BiometricVoiceDataset model"""

    class Meta:
        model = BiometricVoiceDataset
        fields = [
            'id', 'student', 'student_nim', 'student_name',
            'voice_prompt_1_text', 'voice_prompt_2_text',
            'voice_recording_1', 'voice_recording_2',
            'voice_recording_1_mime', 'voice_recording_2_mime',
            'voice_recording_1_duration', 'voice_recording_2_duration',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        required_fields = ['student_nim', 'voice_recording_1', 'voice_recording_2']
        missing = [field for field in required_fields if not attrs.get(field)]
        if missing:
            raise serializers.ValidationError({
                'missing_fields': missing,
                'message': 'Lengkapi 2 rekaman suara sebelum menyimpan.'
            })

        student_nim = attrs.get('student_nim')
        if student_nim and not attrs.get('student'):
            student = SisStudent.objects.filter(nim=student_nim).first()
            if student:
                attrs['student'] = student

        return attrs
