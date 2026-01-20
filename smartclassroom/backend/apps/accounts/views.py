import json
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
from .models import CustomUser, FaceEnrollment, FaceSample, VoiceEnrollment, VoiceSample, AttendanceSession, AttendanceRecord
from .serializers import (
    FaceEnrollmentSerializer,
    FaceEnrollmentStartResponseSerializer,
    FaceSampleSerializer,
    FaceSampleUploadSerializer,
    RegisterSerializer,
    VoiceEnrollmentSerializer,
    VoiceEnrollmentStartResponseSerializer,
    VoiceSampleSerializer,
    VoiceSampleUploadSerializer,
    AttendanceSessionStartResponseSerializer,
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
)
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
        user = request.user
        return Response(
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role,
            }
        )


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
