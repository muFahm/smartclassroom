# Presentasi Backend SmartClassroom

Tanggal: 28 Januari 2026

## 1) Ringkasan Sistem
SmartClassroom adalah sistem dashboard kelas yang menggabungkan:
- **Backend**: Django + Django REST Framework (REST API)
- **Frontend**: React (dashboard dosen dan mahasiswa)
- **Integrasi perangkat**: ROS2/ROSBridge untuk sensor/aktuator + polling device
- **Sumber data akademik**: SIS Trisakti (sinkronisasi data kelas, dosen, mahasiswa)

Fokus presentasi ini: **backend**, dan kaitannya dengan fitur di dropdown **Manajemen Kelas** (user dosen) serta fitur **user mahasiswa**.

---

## 2) Arsitektur Backend (High-Level)

### Komponen Utama
1) **API Service (Django + DRF)**
   - Menyediakan endpoint autentikasi, kuis, absensi, biometrik.
   - URL root: `/api/`

2) **Database**
   - Default: SQLite (`backend/db.sqlite3`)
   - Opsional: PostgreSQL (dependensi `psycopg2-binary` sudah ada)

3) **Media Storage**
   - Upload media kuis disimpan di `MEDIA_ROOT` (folder `backend/media/`)
   - URL media: `MEDIA_URL = /media/` (diserve saat `DEBUG=True`)

4) **SIS Data Cache**
   - Tabel cache lokal untuk data SIS: mata kuliah, kelas, dosen, mahasiswa, KRS.
   - Sinkronisasi lewat management command `sync_sis_data`.

5) **Integrasi Device (di luar backend)**
   - Sensor/actuator dan polling device berjalan via ROS2/ROSBridge/MQTT.
   - Backend **tidak** memproses data ROS2 langsung (frontend yang subscribe/publish).

---

## 3) Tools, Library, dan Konfigurasi Backend

### Tech Stack
- Python 3.10+
- Django 5.2.7
- Django REST Framework 3.16.1
- django-cors-headers 4.9.0
- SQLite (default), PostgreSQL optional
- Token Auth + Session Auth

### Konfigurasi Penting
- **Autentikasi**:
  - `TokenAuthentication` dan `SessionAuthentication`
  - Default permission: `IsAuthenticated`
- **CORS**:
  - Diizinkan `localhost:3000/3001` untuk frontend
- **Custom User**:
  - `accounts.CustomUser` dengan role `admin`/`superadmin` (siap untuk ekspansi role)

---

## 4) Endpoint Backend (Ringkas)

### 4.1 Auth & User Admin
Base path: `/api/accounts/`
- `POST /register/` → registrasi admin
- `POST /login/` → login admin
- `POST /logout/` → logout (token invalidation)
- `GET /profile/` → profil user

### 4.2 Quiz (Kuis)
Base path: `/api/quiz/`
- `GET/POST /packages/` → paket kuis
- `GET/POST /questions/` → pertanyaan kuis
- `GET /question-bank/` → bank soal (read-only)
- `POST /question-bank/{id}/copy_to_package/` → copy soal ke paket lain
- `POST /media/upload_image/` → upload media gambar

### 4.3 Attendance (Absensi & Biometrik)
Base path: `/api/attendance/`
- `GET/POST /sessions/` → list & create sesi absensi
- `GET/POST /records/` → record absensi per mahasiswa
- `POST /sessions/{id}/complete/` → tandai sesi selesai
- `POST /sessions/{id}/cancel/` → batalkan sesi
- `POST /sessions/{id}/bulk-update/` → update status massal
- `GET/POST /biometric-registrations/` → registrasi biometrik (wajah + suara)
- `GET/POST /biometric-face-datasets/` → dataset wajah
- `GET/POST /biometric-voice-datasets/` → dataset suara

### 4.4 Endpoint Khusus Mahasiswa
- `GET /student/{nim}/enrollments/` → daftar mata kuliah mahasiswa
- `GET /student/{nim}/course/{course_id}/attendance/` → detail absensi 17 pertemuan
- `GET /student/{nim}/all-courses/` → ringkasan absensi per mata kuliah
- `GET /student/{student_id}/history/` → riwayat absensi completed
- `GET /student/{student_id}/summary/` → summary total absensi

---

## 5) Struktur Data (Model Utama)

### 5.1 SIS Cache (Master Data)
- `SisCourse`: id, code, name, credits, program
- `SisLecturer`: id, id_staff, name, photo_url
- `SisStudent`: nim, name, photo_url, program
- `SisCourseClass`: course_id, class_code, room, day, start_time, end_time
- `SisCourseClassLecturer`: relasi kelas–dosen
- `SisEnrollment`: relasi mahasiswa–kelas (KRS)

### 5.2 Attendance
- `AttendanceSession`:
  - course_id, course_code, course_name, class_name
  - lecturer_id, lecturer_name
  - date, day_name, start_time, end_time
  - status: `active | completed | cancelled`
- `AttendanceRecord`:
  - student_id, student_name, student_photo_url
  - status: `hadir | sakit | izin | dispensasi | alpha`
  - face_recognized, confidence_score, notes

### 5.3 Biometrik
- `BiometricRegistration`: 4 foto wajah + 2 rekaman suara (base64)
- `BiometricFaceDataset`: dataset wajah terpisah
- `BiometricVoiceDataset`: dataset suara terpisah

### 5.4 Kuis
- `QuizPackage`: title, topic, visibility, owner, metadata
- `QuizQuestion`: body, type, media_url, difficulty, order
- `QuizOption`: label, body_text, is_correct

---

## 6) Aturan Bisnis & Validasi Penting

### Kuis
- Maksimal 4 opsi jawaban (untuk polling device).
- True/False harus tepat 2 opsi.
- Minimal 1 jawaban benar, dan **hanya 1 jawaban benar**.
- Hanya role dosen/admin yang boleh membuat paket/pertanyaan.

### Absensi
- Sesi absensi bisa difilter berdasarkan `lecturer_id`, `course_id`, `course_code`, `class_name`, `date`, `status`.
- Student endpoints hanya mengambil sesi **status=completed**.

### Biometrik
- Registrasi biometrik wajib melengkapi seluruh data wajah + suara.
- Validasi otomatis mengikat `student_nim` ke tabel `SisStudent` bila ada.

---

## 7) Sinkronisasi Data SIS (Backend)
Backend menyediakan command untuk menyinkronkan data SIS dari JSON:
- Command: `python manage.py sync_sis_data --json-path <path> --program <IF|SI>`
- Default lokasi JSON: folder `sisTrisakti/response-datakelasIF.json` atau `response-datakelasSI.json`
- Hasil: isi tabel `SisCourse`, `SisCourseClass`, `SisLecturer`, `SisStudent`, `SisEnrollment`.

---

## 8) Fitur Dropdown “Manajemen Kelas” (User Dosen) & Dukungan Backend

Dropdown dosen berisi:
1) **Jadwal Kelas**
   - Backend: menyediakan data kelas via tabel SIS cache.
   - Data jadwal dan kelas bisa dibaca dari hasil sinkronisasi SIS.
   - Sesi absensi juga bisa difilter per dosen (parameter `lecturer_id`).

2) **Kuis**
   - Backend menyediakan manajemen paket kuis, pertanyaan, bank soal, dan upload media.
   - Role-based access (hanya dosen/admin) untuk membuat dan mengelola kuis.

3) **Registrasi Biometrik**
   - Backend menyediakan endpoint untuk registrasi wajah + suara.
   - Disimpan sebagai base64 di database.

4) **Absensi**
   - Backend mendukung membuat sesi absensi, menyimpan record mahasiswa,
     update status (manual/bulk), dan menutup sesi.
   - Ada endpoint untuk update via face recognition (status hadir otomatis).

5) **Polling Device**
   - Fitur real-time melalui ROS2/MQTT.
   - Backend saat ini tidak mengelola polling device; alur berjalan lewat frontend + ROSBridge.

6) **Light & Temp**
   - Fitur kontrol lingkungan memakai ROS2/ROSBridge.
   - Backend tidak terlibat langsung (frontend publish/subscribe topic).

---

## 9) Fitur User Mahasiswa & Dukungan Backend

Fitur utama mahasiswa yang sudah ditopang backend:
1) **Jadwal Kelas**
   - Endpoint `student/{nim}/enrollments/` menampilkan daftar mata kuliah.

2) **Ringkasan Absensi**
   - Endpoint `student/{nim}/all-courses/` menampilkan summary per mata kuliah.

3) **Detail Absensi Per Mata Kuliah (17 pertemuan)**
   - Endpoint `student/{nim}/course/{course_id}/attendance/`.

4) **Riwayat dan Summary Global**
   - Endpoint `student/{student_id}/history/` dan `student/{student_id}/summary/`.

---

## 10) Catatan Keamanan & Status Produksi

- Default permission backend: `IsAuthenticated`.
- Namun pada modul absensi dan biometrik masih `AllowAny` (ada TODO untuk produksi).
- Artinya, autentikasi perlu diperketat saat sistem masuk tahap produksi.

---

## 11) Ringkasan Value Backend

Backend SmartClassroom memberi pondasi untuk:
- **Manajemen Absensi** (sesi, record, statistik, update massal)
- **Kuis Terstruktur** (paket + bank soal + validasi opsi)
- **Integrasi Biometrik** (wajah + suara)
- **Cache SIS** (mata kuliah, dosen, mahasiswa, KRS)

Dengan layer ini, frontend dapat fokus pada UI/UX, sementara backend menjaga data, aturan bisnis, dan historis aktivitas kelas.

---

## 12) Poin yang Bisa Ditekankan Saat Presentasi

- Backend dirancang modular (apps terpisah: accounts, quiz, attendance).
- Fokus pada data akademik + aktivitas kelas (absensi & kuis).
- Siap menerima integrasi real-time device lewat frontend/ROS2.
- Sudah ada tooling untuk sinkronisasi data SIS.
- Masih ada beberapa TODO untuk produksi (permission absensi, role dosen).

Selesai.