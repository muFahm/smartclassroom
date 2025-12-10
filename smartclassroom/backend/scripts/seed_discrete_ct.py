from django.db import transaction

from apps.accounts.models import CustomUser
from apps.quiz.quizzes.models import QuizOption, QuizPackage, QuizQuestion


def run():
    owner = CustomUser.objects.filter(role="lecturer").order_by("id").first()
    if owner is None:
        raise RuntimeError("Tidak ada user berperan lecturer.")

    package, created = QuizPackage.objects.get_or_create(
        owner=owner,
        title="Quiz Dasar Struktur Diskrit & Computational Thinking",
        defaults={
            "description": "Latihan konsep himpunan, logika, graf, dan pilar computational thinking.",
            "topic": "Struktur Diskrit & Computational Thinking",
            "metadata": {"tags": ["discrete", "ct"], "source": "seed_script"},
        },
    )
    if not created:
        package.questions.all().delete()

    question_data = [
        {
            "order": 1,
            "body": "Dalam himpunan A = {1,2,3,4}, berapa banyak subset berukuran 2 yang bisa dibentuk?",
            "explanation": "Gunakan kombinasi 4C2 = 6.",
            "tag": "discrete",
            "options": [
                ("A", "4", False),
                ("B", "5", False),
                ("C", "6", True),
                ("D", "12", False),
            ],
        },
        {
            "order": 2,
            "body": "Jika diketahui p -> q dan q -> r keduanya benar serta p bernilai benar, kesimpulan yang pasti adalah...",
            "explanation": "Transitivitas implikasi memastikan r bernilai benar.",
            "tag": "discrete",
            "options": [
                ("A", "r pasti benar", True),
                ("B", "r pasti salah", False),
                ("C", "r tidak dapat ditentukan", False),
                ("D", "q harus salah", False),
            ],
        },
        {
            "order": 3,
            "body": "Graf sederhana dengan 6 simpul dan setiap simpul berderajat 2 pasti berbentuk...",
            "explanation": "Semua simpul derajat 2 membentuk satu siklus tertutup.",
            "tag": "discrete",
            "options": [
                ("A", "Graf jalur", False),
                ("B", "Graf siklus", True),
                ("C", "Graf pohon", False),
                ("D", "Graf lengkap", False),
            ],
        },
        {
            "order": 4,
            "body": "Pada tahapan decomposition dalam computational thinking, aktivitas utama yang dilakukan adalah...",
            "explanation": "Masalah besar dipecah menjadi submasalah agar mudah ditangani.",
            "tag": "ct",
            "options": [
                ("A", "Mencari pola kesamaan", False),
                ("B", "Memecah masalah besar menjadi bagian kecil", True),
                ("C", "Menghilangkan detail yang tidak penting", False),
                ("D", "Menulis kode langsung", False),
            ],
        },
        {
            "order": 5,
            "body": "Urutan tahapan inti computational thinking yang benar adalah...",
            "explanation": "Kerangka umum: decomposition, pattern recognition, abstraction, algorithm design.",
            "tag": "ct",
            "options": [
                ("A", "Algorithm -> Abstraction -> Pattern -> Decomposition", False),
                ("B", "Pattern -> Decomposition -> Algorithm -> Abstraction", False),
                ("C", "Decomposition -> Pattern -> Abstraction -> Algorithm", True),
                ("D", "Abstraction -> Algorithm -> Pattern -> Decomposition", False),
            ],
        },
        {
            "order": 6,
            "body": "Pada proses abstraction dalam computational thinking, tujuan utamanya adalah...",
            "explanation": "Abstraksi menyaring detail agar fokus pada informasi penting untuk solusi.",
            "tag": "ct",
            "options": [
                ("A", "Membagi masalah ke modul kecil", False),
                ("B", "Mengabaikan detail yang tidak relevan dan menonjolkan pola penting", True),
                ("C", "Menjalankan kode untuk menguji bug", False),
                ("D", "Menentukan kompleksitas waktu", False),
            ],
        },
    ]

    with transaction.atomic():
        for item in question_data:
            question = QuizQuestion.objects.create(
                package=package,
                body_text=item["body"],
                explanation=item["explanation"],
                question_type=QuizQuestion.TYPE_SINGLE,
                difficulty_tag=item["tag"],
                order=item["order"],
            )
            QuizOption.objects.bulk_create(
                [
                    QuizOption(
                        question=question,
                        label=label,
                        body_text=text,
                        is_correct=is_correct,
                    )
                    for (label, text, is_correct) in item["options"]
                ]
            )

    print(
        {
            "package_id": package.id,
            "question_total": package.questions.count(),
        }
    )


if __name__ == "__main__":
    run()
