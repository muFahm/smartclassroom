from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common.permissions import IsLecturer, IsOwnerOrShared
from .models import QuizPackage, QuizQuestion
from .serializers import QuizPackageSerializer, QuizQuestionSerializer


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

		if getattr(user, "role", "student") == "lecturer":
			return base_qs.filter(Q(owner=user) | Q(visibility=QuizPackage.VISIBILITY_SHARED))
		return base_qs.filter(visibility=QuizPackage.VISIBILITY_SHARED, is_archived=False)

	def perform_create(self, serializer):
		if getattr(self.request.user, "role", "student") != "lecturer":
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
		if getattr(user, "role", "student") == "lecturer":
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
		if getattr(request.user, "role", "student") != "lecturer":
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
