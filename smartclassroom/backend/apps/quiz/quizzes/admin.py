from django.contrib import admin

from .models import QuizOption, QuizPackage, QuizQuestion


class QuizOptionInline(admin.TabularInline):
    model = QuizOption
    extra = 0


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ("package", "order", "question_type", "is_active")
    list_filter = ("question_type", "package")
    search_fields = ("body_text", "package__title")
    inlines = [QuizOptionInline]


@admin.register(QuizPackage)
class QuizPackageAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "visibility", "is_archived", "created_at")
    list_filter = ("visibility", "is_archived")
    search_fields = ("title", "topic", "owner__email")
