"""
Test script untuk Question Bank endpoints
Run: python test_question_bank.py
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Ganti dengan token auth user yang valid
AUTH_TOKEN = "your_token_here"  # TODO: Update dengan token dari login

headers = {
    "Authorization": f"Token {AUTH_TOKEN}",
    "Content-Type": "application/json",
}


def test_list_question_bank():
    """Test GET /api/quiz/question-bank/"""
    print("\n=== Test: List Question Bank ===")
    response = requests.get(f"{BASE_URL}/api/quiz/question-bank/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        questions = data.get("results", data) if isinstance(data, dict) else data
        print(f"Total questions in bank: {len(questions)}")
        if questions:
            print(f"First question: {questions[0]['body_text'][:50]}...")
    else:
        print(f"Error: {response.text}")


def test_search_question_bank():
    """Test GET /api/quiz/question-bank/?search=keyword"""
    print("\n=== Test: Search Question Bank ===")
    search_term = "python"  # Ganti dengan keyword yang ada di database
    response = requests.get(
        f"{BASE_URL}/api/quiz/question-bank/?search={search_term}",
        headers=headers,
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        questions = data.get("results", data) if isinstance(data, dict) else data
        print(f"Found {len(questions)} questions matching '{search_term}'")
    else:
        print(f"Error: {response.text}")


def test_copy_question_to_package(question_id, target_package_id):
    """Test POST /api/quiz/question-bank/{id}/copy_to_package/"""
    print("\n=== Test: Copy Question to Package ===")
    response = requests.post(
        f"{BASE_URL}/api/quiz/question-bank/{question_id}/copy_to_package/",
        headers=headers,
        data=json.dumps({"target_package_id": target_package_id}),
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"Successfully copied question to package {target_package_id}")
        print(f"New question ID: {data['id']}")
    else:
        print(f"Error: {response.text}")


def test_create_question_with_max_options():
    """Test validasi max 4 opsi"""
    print("\n=== Test: Create Question with Max 4 Options ===")
    package_id = 1  # Ganti dengan package ID yang valid
    question_data = {
        "package_id": package_id,
        "body_text": "Test question dengan 4 opsi",
        "question_type": "single",
        "order": 1,
        "options": [
            {"label": "A", "body_text": "Opsi A", "is_correct": True},
            {"label": "B", "body_text": "Opsi B", "is_correct": False},
            {"label": "C", "body_text": "Opsi C", "is_correct": False},
            {"label": "D", "body_text": "Opsi D", "is_correct": False},
        ],
    }
    response = requests.post(
        f"{BASE_URL}/api/quiz/questions/",
        headers=headers,
        data=json.dumps(question_data),
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        print("✓ Successfully created question with 4 options")
    else:
        print(f"Error: {response.text}")


def test_create_question_with_5_options():
    """Test validasi max 4 opsi (harus ditolak)"""
    print("\n=== Test: Create Question with 5 Options (should fail) ===")
    package_id = 1  # Ganti dengan package ID yang valid
    question_data = {
        "package_id": package_id,
        "body_text": "Test question dengan 5 opsi (invalid)",
        "question_type": "single",
        "order": 1,
        "options": [
            {"label": "A", "body_text": "Opsi A", "is_correct": True},
            {"label": "B", "body_text": "Opsi B", "is_correct": False},
            {"label": "C", "body_text": "Opsi C", "is_correct": False},
            {"label": "D", "body_text": "Opsi D", "is_correct": False},
            {"label": "E", "body_text": "Opsi E", "is_correct": False},
        ],
    }
    response = requests.post(
        f"{BASE_URL}/api/quiz/questions/",
        headers=headers,
        data=json.dumps(question_data),
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 400:
        print("✓ Correctly rejected question with 5 options")
        print(f"Error message: {response.json()}")
    else:
        print(f"Unexpected status: {response.text}")


def test_create_truefalse_question():
    """Test create T/F question"""
    print("\n=== Test: Create True/False Question ===")
    package_id = 1  # Ganti dengan package ID yang valid
    question_data = {
        "package_id": package_id,
        "body_text": "Python adalah bahasa programming?",
        "question_type": "truefalse",
        "order": 1,
        "options": [
            {"label": "A", "body_text": "True", "is_correct": True},
            {"label": "B", "body_text": "False", "is_correct": False},
        ],
    }
    response = requests.post(
        f"{BASE_URL}/api/quiz/questions/",
        headers=headers,
        data=json.dumps(question_data),
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        print("✓ Successfully created True/False question")
    else:
        print(f"Error: {response.text}")


if __name__ == "__main__":
    print("=" * 60)
    print("Question Bank API Testing")
    print("=" * 60)
    print("\nNOTE: Update AUTH_TOKEN variable dengan token login Anda")
    print("Run: python test_question_bank.py\n")

    # Uncomment untuk run test (setelah update AUTH_TOKEN)
    # test_list_question_bank()
    # test_search_question_bank()
    # test_create_question_with_max_options()
    # test_create_question_with_5_options()
    # test_create_truefalse_question()
    # test_copy_question_to_package(question_id=1, target_package_id=2)

    print("\n" + "=" * 60)
