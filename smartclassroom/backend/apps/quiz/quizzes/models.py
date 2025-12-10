from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		abstract = True


class QuizPackage(TimeStampedModel):
	VISIBILITY_PRIVATE = "private"
	VISIBILITY_SHARED = "shared"
	VISIBILITY_CHOICES = [
		(VISIBILITY_PRIVATE, "Private"),
		(VISIBILITY_SHARED, "Shared"),
	]

	owner = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="quiz_packages",
	)
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	topic = models.CharField(max_length=255, blank=True)
	visibility = models.CharField(
		max_length=20, choices=VISIBILITY_CHOICES, default=VISIBILITY_PRIVATE
	)
	metadata = models.JSONField(default=dict, blank=True)
	is_archived = models.BooleanField(default=False)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self) -> str:
		return self.title


class QuizQuestion(TimeStampedModel):
	TYPE_SINGLE = "single"
	TYPE_MULTIPLE = "multiple"
	TYPE_TRUE_FALSE = "truefalse"
	TYPE_NUMERIC = "numeric"
	QUESTION_TYPES = [
		(TYPE_SINGLE, "Single Choice"),
		(TYPE_MULTIPLE, "Multiple Choice"),
		(TYPE_TRUE_FALSE, "True/False"),
		(TYPE_NUMERIC, "Numeric"),
	]

	package = models.ForeignKey(
		QuizPackage,
		on_delete=models.CASCADE,
		related_name="questions",
	)
	body_text = models.TextField()
	explanation = models.TextField(blank=True)
	media_url = models.URLField(blank=True)
	question_type = models.CharField(
		max_length=20, choices=QUESTION_TYPES, default=TYPE_SINGLE
	)
	difficulty_tag = models.CharField(max_length=50, blank=True)
	order = models.PositiveIntegerField(default=1)
	is_active = models.BooleanField(default=True)

	class Meta:
		ordering = ["order", "id"]
		unique_together = ("package", "order")

	def __str__(self) -> str:
		return f"{self.package.title} - Q{self.order}"


class QuizOption(TimeStampedModel):
	question = models.ForeignKey(
		QuizQuestion,
		on_delete=models.CASCADE,
		related_name="options",
	)
	label = models.CharField(max_length=5, default="A")
	body_text = models.CharField(max_length=255)
	is_correct = models.BooleanField(default=False)

	class Meta:
		ordering = ["label"]
		constraints = [
			models.UniqueConstraint(
				fields=["question", "label"], name="unique_option_label_per_question"
			)
		]

	def __str__(self) -> str:
		return f"{self.question_id} - {self.label}"
