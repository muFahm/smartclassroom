import json
from datetime import datetime, timedelta
from django.core.files.base import ContentFile

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .biometrics.face_processing import process_face_image
from .biometrics.voice_processing import analyze_voice_sample, compute_enrollment_embedding
from .biometrics.face_service import get_face_service
from .models import (
    CustomUser,
    FaceEnrollment,
    FaceSample,
    VoiceEnrollment,
    VoiceSample,
    AttendanceSession,
    AttendanceRecord,
    UserActivityLog,
)
from .serializers import (
    ActivityLogSerializer,
    FaceEnrollmentSerializer,
    FaceEnrollmentStartResponseSerializer,
    FaceSampleSerializer,
    FaceSampleUploadSerializer,
    ProfileSerializer,
    RegisterSerializer,
    VoiceEnrollmentSerializer,
    VoiceEnrollmentStartResponseSerializer,
    VoiceSampleSerializer,
    VoiceSampleUploadSerializer,
    AttendanceSessionStartResponseSerializer,
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
)
from apps.quiz.sessions.models import DeviceResponse, QuizSession, SessionQuestion
from apps.classrooms.models import ClassSession, SessionNote
from django.utils import timezone


@csrf_exempt
def register_view(request):
    if request.method == "POST":
        data = json.loads(request.body)
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse({"success": True, "message": "User registered successfully"})
        return JsonResponse({"success": False, "errors": serializer.errors}, status=400)
    return JsonResponse({"success": False, "error": "Method not allowed"}, status=405)


@csrf_exempt
def login_view(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")
        user = authenticate(request, email=email, password=password)
        if user:
            login(request, user)
            return JsonResponse(
                {
                    "success": True,
                    "email": user.email,
                    "role": user.role,
                    "username": user.username,
                }
            )
        return JsonResponse({"success": False, "error": "Invalid email or password"}, status=400)
    return JsonResponse({"success": False, "error": "Method not allowed"}, status=405)


@csrf_exempt
def logout_view(request):
    if request.method == "POST":
        logout(request)
        return JsonResponse({"success": True, "message": "Logged out successfully"})
    return JsonResponse({"success": False, "error": "Method not allowed"}, status=405)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "username": self.user.username,
            "role": self.user.role,
        }
        return data


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        UserActivityLog.objects.create(
            user=request.user,
            activity_type=UserActivityLog.TYPE_PROFILE,
            message="Profil diperbarui",
            metadata={k: v for k, v in request.data.items()},
        )
        return Response(serializer.data)


class FaceEnrollmentStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Deactivate any previous enrollment
        FaceEnrollment.objects.filter(user=request.user, is_active=True).update(is_active=False)
        enrollment = FaceEnrollment.objects.create(user=request.user, is_active=False)
        payload = {
            "enrollment_id": enrollment.id,
            "required_prompts": [
                FaceSample.PROMPT_NEUTRAL,
                FaceSample.PROMPT_EYES_CLOSED,
                FaceSample.PROMPT_MOUTH_OPEN,
            ],
        }
        return Response(FaceEnrollmentStartResponseSerializer(payload).data)


class FaceEnrollmentSampleUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, enrollment_id: int):
        serializer = FaceSampleUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prompt_type = serializer.validated_data["prompt_type"]
        image = serializer.validated_data["image"]

        enrollment = FaceEnrollment.objects.filter(id=enrollment_id, user=request.user).first()
        if not enrollment:
            return Response({"detail": "Enrollment tidak ditemukan."}, status=404)

        # Enforce exactly one sample per prompt for this enrollment
        exists = FaceSample.objects.filter(user=request.user, enrollment=enrollment, prompt_type=prompt_type).exists()
        if exists:
            return Response({"detail": "Foto untuk prompt ini sudah ada. Silakan retake dengan delete/replace."}, status=400)

        processed_bytes, quality = process_face_image(image.read(), output_size=256)
        filename = f"{prompt_type}.jpg"

        sample = FaceSample.objects.create(
            user=request.user,
            enrollment=enrollment,
            prompt_type=prompt_type,
            blur_score=quality.blur_score,
        )
        sample.image.save(filename, ContentFile(processed_bytes), save=True)

        return Response(FaceSampleSerializer(sample).data, status=201)


class FaceEnrollmentCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, enrollment_id: int):
        enrollment = FaceEnrollment.objects.filter(id=enrollment_id, user=request.user).first()
        if not enrollment:
            return Response({"detail": "Enrollment tidak ditemukan."}, status=404)

        required = {
            FaceSample.PROMPT_NEUTRAL,
            FaceSample.PROMPT_EYES_CLOSED,
            FaceSample.PROMPT_MOUTH_OPEN,
        }
        got = set(
            FaceSample.objects.filter(user=request.user, enrollment=enrollment)
            .values_list("prompt_type", flat=True)
        )
        missing = sorted(list(required - got))
        if missing:
            return Response({"detail": "Foto belum lengkap.", "missing": missing}, status=400)

        # Activate this enrollment, deactivate others
        FaceEnrollment.objects.filter(user=request.user).exclude(id=enrollment.id).update(is_active=False)
        enrollment.is_active = True
        enrollment.save(update_fields=["is_active", "updated_at"])

        return Response(FaceEnrollmentSerializer(enrollment).data)


class VoiceEnrollmentStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        VoiceEnrollment.objects.filter(user=request.user, is_active=True).update(is_active=False)
        enrollment = VoiceEnrollment.objects.create(user=request.user, is_active=False)
        payload = {"enrollment_id": enrollment.id, "min_voice_active_ms": 30000}
        return Response(VoiceEnrollmentStartResponseSerializer(payload).data)


class VoiceEnrollmentSampleUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, enrollment_id: int):
        serializer = VoiceSampleUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        audio = serializer.validated_data["audio"]

        enrollment = VoiceEnrollment.objects.filter(id=enrollment_id, user=request.user).first()
        if not enrollment:
            return Response({"detail": "Enrollment tidak ditemukan."}, status=404)

        exists = VoiceSample.objects.filter(user=request.user, enrollment=enrollment).exists()
        if exists:
            return Response({"detail": "Sample suara untuk enrollment ini sudah ada."}, status=400)

        sample = VoiceSample.objects.create(user=request.user, enrollment=enrollment)
        sample.audio.save(audio.name, audio, save=True)

        try:
            metrics, _ = analyze_voice_sample(sample.audio.path)
        except Exception as e:
            sample.delete()
            return Response({"detail": f"Gagal memproses audio: {e}"}, status=400)

        sample.duration_ms = metrics.duration_ms
        sample.voice_active_ms = metrics.voice_active_ms
        sample.voice_ratio = metrics.voice_ratio
        sample.vad_threshold = metrics.vad_threshold
        sample.rms_in = metrics.rms_in
        sample.save(update_fields=["duration_ms", "voice_active_ms", "voice_ratio", "vad_threshold", "rms_in"])

        if metrics.voice_active_ms < 30000:
            return Response(
                {
                    "detail": "Suara efektif kurang dari 30 detik. Silakan rekam ulang.",
                    "voice_active_ms": metrics.voice_active_ms,
                    "duration_ms": metrics.duration_ms,
                    "voice_ratio": metrics.voice_ratio,
                    "vad_threshold": metrics.vad_threshold,
                    "rms_in": metrics.rms_in,
                },
                status=400,
            )

        return Response(VoiceSampleSerializer(sample).data, status=201)


class MyScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        def parse_dt(value, default):
            if not value:
                return default
            dt = datetime.fromisoformat(value)
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt)
            return dt

        try:
            start_dt = parse_dt(start, now)
            end_dt = parse_dt(end, now + timedelta(days=14))
        except Exception:
            return Response({"detail": "Format tanggal tidak valid. Gunakan ISO 8601."}, status=400)

        sessions = (
            ClassSession.objects.filter(course_class__students=request.user, scheduled_start__gte=start_dt, scheduled_start__lte=end_dt)
            .select_related("course_class__course", "course_class__lecturer", "classroom")
            .order_by("scheduled_start")
        )
        payload = []
        for s in sessions:
            payload.append(
                {
                    "id": s.id,
                    "course_code": s.course_class.course.code,
                    "course_name": s.course_class.course.name,
                    "topic": s.topic or s.course_class.course.name,
                    "scheduled_start": s.scheduled_start,
                    "scheduled_end": s.scheduled_end,
                    "status": s.status,
                    "classroom": s.classroom.name if s.classroom else "",
                    "lecturer": s.course_class.lecturer.email if s.course_class.lecturer else "",
                }
            )
        return Response(payload)


class MyResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        responses = (
            DeviceResponse.objects.filter(participant__user=request.user)
            .select_related("session_question__session", "option__question__package")
            .order_by("session_question__session_id")
        )
        sessions = {}
        for resp in responses:
            session = resp.session_question.session
            if session.id not in sessions:
                sessions[session.id] = {
                    "session_id": session.id,
                    "session_code": session.code,
                    "package_title": session.package.title,
                    "total": 0,
                    "correct": 0,
                    "last_submitted": resp.submitted_at,
                }
            entry = sessions[session.id]
            entry["total"] += 1
            if resp.option.is_correct:
                entry["correct"] += 1
            if resp.submitted_at and resp.submitted_at > entry["last_submitted"]:
                entry["last_submitted"] = resp.submitted_at

        return Response(list(sessions.values()))


class MyNotesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notes = (
            SessionNote.objects.filter(class_session__course_class__students=request.user)
            .select_related("class_session__course_class__course")
            .order_by("-updated_at")[:50]
        )
        payload = []
        for n in notes:
            payload.append(
                {
                    "id": n.id,
                    "class_session_id": n.class_session_id,
                    "course_name": n.class_session.course_class.course.name,
                    "topic": n.class_session.topic,
                    "summary": n.summary,
                    "transcript": n.transcript[:5000],
                    "updated_at": n.updated_at,
                }
            )
        return Response(payload)


class MyActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = UserActivityLog.objects.filter(user=request.user).order_by("-created_at")[:50]
        return Response(ActivityLogSerializer(logs, many=True).data)


class VoiceEnrollmentCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, enrollment_id: int):
        enrollment = VoiceEnrollment.objects.filter(id=enrollment_id, user=request.user).first()
        if not enrollment:
            return Response({"detail": "Enrollment tidak ditemukan."}, status=404)

        sample = VoiceSample.objects.filter(user=request.user, enrollment=enrollment).first()
        if not sample:
            return Response({"detail": "Sample suara belum diupload."}, status=400)

        if (sample.voice_active_ms or 0) < 30000:
            return Response(
                {
                    "detail": "Suara efektif kurang dari 30 detik.",
                    "voice_active_ms": sample.voice_active_ms,
                },
                status=400,
            )

        embedding = []
        quality_score = sample.voice_ratio
        try:
            embedding, _ = compute_enrollment_embedding(sample.audio.path)
        except Exception:
            embedding = []

        enrollment.embedding = embedding
        enrollment.quality_score = quality_score

        VoiceEnrollment.objects.filter(user=request.user).exclude(id=enrollment.id).update(is_active=False)
        enrollment.is_active = True
        enrollment.save(update_fields=["embedding", "quality_score", "is_active", "updated_at"])

        data = VoiceEnrollmentSerializer(enrollment).data
        if not embedding:
            data["detail"] = "Voice enrollment selesai (aktif). Embedding akan diisi saat model tersedia."
        return Response(data)


# -------------------
# Attendance API
# -------------------


class FaceEncodingsReloadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "lecturer":
            return Response({"detail": "Forbidden"}, status=403)
        fs = get_face_service()
        try:
            fs.reload()
            return Response({"detail": "Reloaded encodings", "path": fs._loaded_path})
        except Exception as e:
            return Response({"detail": f"Reload failed: {e}"}, status=500)


class AttendanceSessionStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "lecturer":
            return Response({"detail": "Forbidden"}, status=403)

        session = AttendanceSession.objects.create(host=request.user, is_active=True, started_at=timezone.now())
        payload = {"session_id": session.id}
        return Response(AttendanceSessionStartResponseSerializer(payload).data)


class AttendanceRecognizeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id: int):
        session = AttendanceSession.objects.filter(id=session_id).first()
        if not session or not session.is_active:
            return Response({"detail": "Session not found or not active."}, status=404)

        if request.user != session.host:
            return Response({"detail": "Forbidden"}, status=403)

        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "No image provided."}, status=400)

        fs = get_face_service()
        if not fs.available():
            return Response(
                {
                    "detail": "Face recognition service unavailable. Ensure 'face-recognition' is installed and encodings.pickle path is configured.",
                    "loaded_path": getattr(fs, "_loaded_path", None),
                },
                status=500,
            )
        results = fs.identify(image.read())

        out = []
        for r in results:
            entry = {"label": r.label, "distance": r.distance, "student": None, "already_recorded": False}
            user = fs.map_label_to_user(r.label)
            if user and user.role == "student":
                extracted_nim = ""
                if r.label and "_" in r.label:
                    extracted_nim = r.label.split("_", 1)[1]
                obj, created = AttendanceRecord.objects.get_or_create(
                    session=session,
                    student=user,
                    defaults={
                        "recognized_label": r.label,
                        "recognized_name": user.username,
                        "recognized_nim": extracted_nim,
                    },
                )
                entry["student"] = {"id": user.id, "username": user.username, "email": user.email}
                entry["already_recorded"] = not created
            out.append(entry)

        return Response({"results": out, "loaded_path": getattr(fs, "_loaded_path", None)})


class AttendanceSessionStopView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id: int):
        session = AttendanceSession.objects.filter(id=session_id).first()
        if not session or not session.is_active:
            return Response({"detail": "Session not found or not active."}, status=404)
        if request.user != session.host:
            return Response({"detail": "Forbidden"}, status=403)
        session.is_active = False
        session.ended_at = timezone.now()
        session.save(update_fields=["is_active", "ended_at"])
        return Response(AttendanceSessionSerializer(session).data)


class AttendanceSessionRecordsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id: int):
        session = AttendanceSession.objects.filter(id=session_id).first()
        if not session:
            return Response({"detail": "Session not found."}, status=404)
        if request.user != session.host:
            return Response({"detail": "Forbidden"}, status=403)
        records = AttendanceRecord.objects.filter(session=session).select_related("student")
        return Response(AttendanceRecordSerializer(records, many=True).data)
