"""
Script untuk inspect questions dan media_url di database.

Usage:
    python scripts/inspect_questions.py
"""
import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, backend_dir)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartclassroom.settings')
    django.setup()

from apps.quiz.quizzes.models import QuizQuestion, QuizPackage

def inspect_questions():
    """Inspect semua questions dan tampilkan info media_url."""
    questions = QuizQuestion.objects.all().select_related('package').prefetch_related('options')
    
    print(f"\n📊 Total Questions: {questions.count()}\n")
    
    if questions.count() == 0:
        print("❌ Tidak ada questions di database")
        return
    
    for q in questions:
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"📝 Question #{q.order} - ID: {q.id}")
        print(f"   Package: {q.package.title} (ID: {q.package_id})")
        print(f"   Text: {q.body_text[:60]}...")
        print(f"   Type: {q.question_type}")
        print(f"   🖼️  Media URL: {q.media_url if q.media_url else '(none)'}")
        print(f"   Options: {q.options.count()}")
        for opt in q.options.all():
            mark = "✓" if opt.is_correct else " "
            print(f"      [{mark}] {opt.label}. {opt.body_text}")
        print()

if __name__ == "__main__":
    inspect_questions()
