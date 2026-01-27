"""
Script untuk clean semua pertanyaan dari semua paket kuis.
Gunakan untuk testing fresh start.

Usage:
    python manage.py shell < scripts/clean_all_questions.py
atau
    python scripts/clean_all_questions.py
"""
import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    # Tambahkan backend directory ke Python path
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, backend_dir)
    
    # Setup Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartclassroom.settings')
    django.setup()

from apps.quiz.quizzes.models import QuizQuestion, QuizOption
from django.db import connection

def clean_all_questions():
    """Hapus semua pertanyaan dan options dari database."""
    option_count = QuizOption.objects.count()
    question_count = QuizQuestion.objects.count()
    
    print(f"🗑️  Menghapus {option_count} options dan {question_count} questions...")
    
    # Disable foreign key checks untuk SQLite
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_keys = OFF;")
    
    try:
        # Hapus semua options dulu (karena foreign key ke questions)
        QuizOption.objects.all().delete()
        print(f"✅ Semua options telah dihapus")
        
        # Hapus semua questions
        QuizQuestion.objects.all().delete()
        print(f"✅ Semua questions telah dihapus")
        
        print(f"\n✨ Database sudah bersih! Siap untuk testing fresh.")
        print(f"   - {option_count} options dihapus")
        print(f"   - {question_count} questions dihapus")
    finally:
        # Re-enable foreign key checks
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = ON;")

if __name__ == "__main__":
    response = input("⚠️  Yakin ingin menghapus SEMUA pertanyaan dari semua paket? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        clean_all_questions()
    else:
        print("❌ Dibatalkan")
