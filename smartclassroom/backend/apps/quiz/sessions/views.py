import random
import uuid

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common.permissions import IsLecturer
from apps.quiz.analytics.models import QuestionStat
from apps.quiz.analytics.serializers import QuestionStatSerializer
from .models import DeviceResponse, PollingDevice, QuizSession, SessionParticipant, SessionQuestion
from .serializers import (
	DeviceResponseSerializer,
	PollingDeviceSerializer,
	QuizSessionSerializer,
	SessionParticipantAdminSerializer,
	SessionParticipantSerializer,
	SessionQuestionSerializer,
)


class PollingDeviceViewSet(viewsets.ModelViewSet):
	queryset = PollingDevice.objects.all()
	serializer_class = PollingDeviceSerializer
	permission_classes = [IsLecturer]

	@action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
	def my_device(self, request):
		device = PollingDevice.objects.filter(assigned_to=request.user).first()
		if not device:
			return Response({}, status=status.HTTP_204_NO_CONTENT)
		serializer = self.get_serializer(device)
		return Response(serializer.data)

	@action(detail=True, methods=["post"], permission_classes=[IsLecturer])
	def refresh_token(self, request, pk=None):
		device = self.get_object()
		device.refresh_token()
		serializer = self.get_serializer(device)
		return Response(serializer.data)


class QuizSessionViewSet(viewsets.ModelViewSet):
	serializer_class = QuizSessionSerializer
	permission_classes = [IsLecturer]
	filterset_fields = ["status", "package"]

	def get_queryset(self):
		return QuizSession.objects.filter(host=self.request.user).select_related("package")

	@action(detail=True, methods=["post"])
	def start(self, request, pk=None):
		session = self.get_object()
		if session.status != QuizSession.STATUS_DRAFT:
			raise ValidationError("Sesi sudah dimulai atau ditutup.")
		first_question = session.session_questions.order_by("order").first()
		session.status = QuizSession.STATUS_LIVE
		session.started_at = timezone.now()
		session.current_question = first_question
		session.save(update_fields=["status", "started_at", "current_question"])
		return Response(self.get_serializer(session).data)

	@action(detail=True, methods=["post"])
	def open_question(self, request, pk=None):
		session = self.get_object()
		question_id = request.data.get("session_question_id")
		question = self._get_session_question(session, question_id)
		now = timezone.now()
		question.is_open = True
		question.opened_at = question.opened_at or now
		question.closed_at = None
		question.save(update_fields=["is_open", "opened_at", "closed_at"])
		session.current_question = question
		session.status = QuizSession.STATUS_LIVE
		session.save(update_fields=["current_question", "status"])
		return Response(SessionParticipantSerializer(session.participants.all(), many=True).data)

	@action(detail=True, methods=["post"])
	def close_question(self, request, pk=None):
		session = self.get_object()
		question = session.current_question
		if not question:
			raise ValidationError("Belum ada pertanyaan aktif.")
		question.is_open = False
		question.closed_at = timezone.now()
		question.save(update_fields=["is_open", "closed_at"])
		return Response(SessionQuestionSerializer(question).data)

	@action(detail=True, methods=["post"])
	def reveal_answer(self, request, pk=None):
		session = self.get_object()
		question = session.current_question
		if not question:
			raise ValidationError("Tidak ada pertanyaan yang dipilih.")
		question.revealed_at = timezone.now()
		question.save(update_fields=["revealed_at"])
		return Response(SessionQuestionSerializer(question).data)

	@action(detail=True, methods=["post"])
	def end(self, request, pk=None):
		session = self.get_object()
		session.status = QuizSession.STATUS_CLOSED
		session.closed_at = timezone.now()
		session.current_question = None
		session.save(update_fields=["status", "closed_at", "current_question"])
		return Response(self.get_serializer(session).data)

	@action(detail=True, methods=["get"])
	def participants(self, request, pk=None):
		session = self.get_object()
		participants = session.participants.select_related("user", "device").order_by("-created_at")
		serializer = SessionParticipantAdminSerializer(participants, many=True)
		return Response(serializer.data)

	@action(detail=True, methods=["get"], url_path="results")
	def results(self, request, pk=None):
		session = self.get_object()
		question_id = request.query_params.get("session_question_id") or session.current_question_id
		if not question_id:
			raise ValidationError("Tidak ada pertanyaan aktif untuk ditampilkan.")
		question = session.session_questions.filter(id=question_id).first()
		if not question:
			raise ValidationError("Pertanyaan tidak ditemukan dalam sesi ini.")
		stat, _ = QuestionStat.objects.get_or_create(session_question=question)
		serializer = QuestionStatSerializer(stat)
		return Response(serializer.data)

	@action(detail=True, methods=["post"], url_path="seed-participants")
	def seed_participants(self, request, pk=None):
		session = self.get_object()
		try:
			count = int(request.data.get("count", 0))
		except (TypeError, ValueError):
			raise ValidationError({"count": "Jumlah peserta harus berupa angka."})
		if count <= 0:
			raise ValidationError({"count": "Minimal satu peserta."})
		User = get_user_model()
		code_slug = (session.code or f"sess{session.pk}").lower()
		created = []
		for _ in range(count):
			email = f"sim_{code_slug}_{uuid.uuid4().hex[:6]}@sim.local"
			user = User.objects.create_user(
				email=email,
				username=email.split("@")[0],
				password=User.objects.make_random_password(),
				role="student",
			)
			participant = SessionParticipant.objects.create(
				session=session,
				user=user,
				status=SessionParticipant.STATUS_CONNECTED,
			)
			created.append({
				"participant_id": participant.id,
				"user_email": user.email,
			})
		return Response(created, status=status.HTTP_201_CREATED)

	@action(detail=True, methods=["post"], url_path="simulate-responses")
	def simulate_responses(self, request, pk=None):
		session = self.get_object()
		question_id = request.data.get("session_question_id") or session.current_question_id
		if not question_id:
			raise ValidationError("Sesi belum memiliki pertanyaan aktif.")
		question = session.session_questions.select_related("question").prefetch_related("question__options").filter(id=question_id).first()
		if not question:
			raise ValidationError("Pertanyaan tidak ditemukan.")
		participant_ids = request.data.get("participant_ids") or list(
			session.participants.values_list("id", flat=True)
		)
		if not participant_ids:
			raise ValidationError("Tidak ada peserta untuk disimulasikan.")
		try:
			correct_ratio = float(request.data.get("correct_ratio", 0.5))
		except (TypeError, ValueError):
			raise ValidationError({"correct_ratio": "Persentase benar tidak valid."})
		correct_ratio = min(max(correct_ratio, 0.0), 1.0)
		options = list(question.question.options.all())
		correct_options = [option for option in options if option.is_correct]
		incorrect_options = [option for option in options if not option.is_correct]
		if not correct_options or not incorrect_options:
			raise ValidationError("Pertanyaan harus memiliki opsi benar dan salah untuk simulasi.")
		created = 0
		for participant_id in participant_ids:
			try:
				participant_id = int(participant_id)
			except (TypeError, ValueError):
				continue
			participant = session.participants.filter(id=participant_id).first()
			if not participant:
				continue
			choose_correct = random.random() <= correct_ratio
			option = random.choice(correct_options if choose_correct else incorrect_options)
			DeviceResponse.objects.update_or_create(
				session_question=question,
				participant=participant,
				defaults={"option": option, "source": DeviceResponse.SOURCE_DEVICE},
			)
			created += 1
		return Response({"processed": created})

	def _get_session_question(self, session: QuizSession, question_id):
		try:
			question_id = int(question_id)
		except (TypeError, ValueError):
			raise ValidationError({"session_question_id": "ID pertanyaan tidak valid."})
		question = session.session_questions.filter(id=question_id).first()
		if not question:
			raise ValidationError("Pertanyaan tidak ditemukan dalam sesi ini.")
		return question


class SessionParticipantViewSet(viewsets.ModelViewSet):
	serializer_class = SessionParticipantSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		return SessionParticipant.objects.filter(user=self.request.user).select_related("session")

	def create(self, request, *args, **kwargs):
		session_code = request.data.get("session_code")
		if not session_code:
			raise ValidationError({"session_code": "Kode sesi wajib diisi."})
		session = QuizSession.objects.filter(code=session_code).first()
		if not session:
			raise ValidationError("Sesi tidak ditemukan.")
		participant, _ = SessionParticipant.objects.update_or_create(
			session=session,
			user=request.user,
			defaults={"status": SessionParticipant.STATUS_CONNECTED},
		)
		serializer = self.get_serializer(participant)
		return Response(serializer.data, status=status.HTTP_200_OK)


class DeviceResponseViewSet(viewsets.ModelViewSet):
	serializer_class = DeviceResponseSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		return DeviceResponse.objects.filter(participant__user=self.request.user)

	def perform_create(self, serializer):
		participant = serializer.validated_data["participant"]
		if participant.user_id != self.request.user.id:
			raise ValidationError("Tidak dapat mengirim jawaban untuk peserta lain.")
		serializer.save()
