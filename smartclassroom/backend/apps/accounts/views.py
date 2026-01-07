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
from .models import CustomUser, FaceEnrollment, FaceSample
from .serializers import (
    FaceEnrollmentSerializer,
    FaceEnrollmentStartResponseSerializer,
    FaceSampleSerializer,
    FaceSampleUploadSerializer,
    RegisterSerializer,
)


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
