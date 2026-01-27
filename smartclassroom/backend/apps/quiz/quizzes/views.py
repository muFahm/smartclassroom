from django.db.models import Q, Max
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from apps.common.permissions import IsLecturer, IsOwnerOrShared
from .models import QuizPackage, QuizQuestion, QuizOption
from .serializers import QuizPackageSerializer, QuizQuestionSerializer


def _is_instructor(user) -> bool:
    return getattr(user, "role", None) in {"admin", "superadmin", "lecturer"}


class QuizPackageViewSet(viewsets.ModelViewSet):
    serializer_class = QuizPackageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["visibility", "topic", "is_archived"]
    search_fields = ["title", "description", "topic"]
    ordering_fields = ["created_at", "title"]

    def get_queryset(self):
        user = self.request.user
        base_qs = QuizPackage.objects.all()
        if not user.is_authenticated:
            return base_qs.none()

        if _is_instructor(user):
            return base_qs.filter(Q(owner=user) | Q(visibility=QuizPackage.VISIBILITY_SHARED))
        return base_qs.filter(visibility=QuizPackage.VISIBILITY_SHARED, is_archived=False)

    def perform_create(self, serializer):
        if not _is_instructor(self.request.user):
            raise ValidationError("Hanya dosen/admin yang dapat membuat paket kuis.")
        serializer.save(owner=self.request.user)

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsLecturer()]
        if self.action in {"retrieve"}:
            return [permissions.IsAuthenticated(), IsOwnerOrShared()]
        return super().get_permissions()


class QuizQuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuizQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["package", "question_type", "is_active"]
    search_fields = ["body_text", "explanation", "difficulty_tag"]
    ordering_fields = ["order", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = QuizQuestion.objects.select_related("package")
        if not user.is_authenticated:
            return qs.none()
        if _is_instructor(user):
            return qs.filter(package__owner=user)
        return qs.filter(package__visibility=QuizPackage.VISIBILITY_SHARED)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action == "create":
            context["package"] = self._get_package_from_request()
        elif self.action in {"update", "partial_update"}:
            context["package"] = self.get_object().package
        return context

    def create(self, request, *args, **kwargs):
        if not _is_instructor(request.user):
            raise ValidationError("Hanya dosen/admin yang dapat membuat pertanyaan.")
        data = request.data.copy()
        data.pop("package_id", None)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _get_package_from_request(self) -> QuizPackage:
        package_id = self.request.data.get("package_id")
        if not package_id:
            raise ValidationError({"package_id": "Wajib memilih paket kuis."})
        package = get_object_or_404(QuizPackage, pk=package_id)
        if package.owner_id != self.request.user.id:
            raise ValidationError("Anda tidak memiliki akses ke paket ini.")
        return package


class QuestionBankViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet untuk Question Bank: list/search semua pertanyaan milik user.
    Endpoint custom `copy_to_package` untuk reuse pertanyaan ke paket lain.
    """
    serializer_class = QuizQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["question_type", "difficulty_tag"]
    search_fields = ["body_text", "explanation", "package__topic", "package__title"]
    ordering_fields = ["created_at", "order"]

    def get_queryset(self):
        user = self.request.user
        if not _is_instructor(user):
            return QuizQuestion.objects.none()
        # Tampilkan semua pertanyaan dari paket milik user + paket shared
        return QuizQuestion.objects.select_related("package").prefetch_related("options").filter(
            Q(package__owner=user) | Q(package__visibility=QuizPackage.VISIBILITY_SHARED)
        ).distinct()

    @action(detail=True, methods=["post"])
    def copy_to_package(self, request, pk=None):
        """
        Copy pertanyaan ini ke paket lain (duplicate).
        Body: {"target_package_id": int}
        """
        source_question = self.get_object()
        target_package_id = request.data.get("target_package_id")
        if not target_package_id:
            raise ValidationError({"target_package_id": "Wajib memilih paket tujuan."})
        
        target_package = get_object_or_404(QuizPackage, pk=target_package_id)
        if target_package.owner_id != request.user.id:
            raise ValidationError("Anda tidak memiliki akses ke paket tujuan.")
        
        # Hitung order baru
        max_order = target_package.questions.aggregate(Max("order"))["order__max"] or 0
        new_order = max_order + 1
        
        # Copy question
        new_question = QuizQuestion.objects.create(
            package=target_package,
            body_text=source_question.body_text,
            explanation=source_question.explanation,
            media_url=source_question.media_url,
            question_type=source_question.question_type,
            difficulty_tag=source_question.difficulty_tag,
            order=new_order,
            is_active=source_question.is_active,
        )
        
        # Copy options
        options_to_create = []
        for option in source_question.options.all():
            options_to_create.append(
                QuizOption(
                    question=new_question,
                    label=option.label,
                    body_text=option.body_text,
                    is_correct=option.is_correct,
                )
            )
        QuizOption.objects.bulk_create(options_to_create)
        
        serializer = self.get_serializer(new_question)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuizMediaUploadViewSet(viewsets.ViewSet):
    """
    ViewSet untuk upload gambar soal kuis.
    """
    permission_classes = [permissions.IsAuthenticated, IsLecturer]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=["post"])
    def upload_image(self, request):
        """
        Upload gambar dan return URL.
        """
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "File tidak ditemukan"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validasi tipe file
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            return Response(
                {"error": "Tipe file tidak didukung. Gunakan JPEG, PNG, GIF, atau WebP."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validasi ukuran file (max 5MB)
        if file.size > 5 * 1024 * 1024:
            return Response(
                {"error": "Ukuran file terlalu besar. Maksimal 5MB."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Simpan file
        file_path = f"quiz_images/{request.user.id}/{file.name}"
        saved_path = default_storage.save(file_path, file)
        file_url = request.build_absolute_uri(default_storage.url(saved_path))
        
        return Response({"url": file_url}, status=status.HTTP_201_CREATED)
