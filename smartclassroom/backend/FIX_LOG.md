# Fix Log - Quiz Questions Issues

## Masalah yang Diperbaiki

### 1. Error saat Hapus Pertanyaan (FOREIGN KEY constraint failed)
**Root Cause**: 
- Model `QuizQuestion` memiliki `unique_together = ("package", "order")` yang menyebabkan constraint conflict saat delete
- SQLite foreign key constraints terlalu strict

**Solusi**:
- ✅ Hapus `unique_together` constraint dari model QuizQuestion
- ✅ Buat migration baru: `0002_remove_quizquestion_unique_together.py`
- ✅ Jalankan migration untuk update schema database
- ✅ Script clean dengan disable foreign key checks sementara

**Files Changed**:
- `backend/apps/quiz/quizzes/models.py` - Remove unique_together
- `backend/apps/quiz/quizzes/migrations/0002_remove_quizquestion_unique_together.py` - New migration
- `backend/scripts/clean_all_questions.py` - Script untuk clean data

### 2. Pertanyaan dari Paket Sebelumnya Masih Muncul
**Root Cause**:
- State tidak ter-reset dengan sempurna saat packageId berubah
- `pkg` state tidak di-reset, menyebabkan title lama masih tampil

**Solusi**:
- ✅ Update useEffect untuk reset semua state termasuk `pkg`
- ✅ Set loading state ke true untuk memastikan re-render
- ✅ Clear semua form state saat ganti paket

**Files Changed**:
- `frontend/src/pages/dashboard/PackageDetailPage.jsx` - Enhanced useEffect reset logic

## Files yang Dimodifikasi

1. **Backend Models**:
   - `backend/apps/quiz/quizzes/models.py`
   - Removed `unique_together = ("package", "order")` constraint

2. **Backend Migrations**:
   - `backend/apps/quiz/quizzes/migrations/0002_remove_quizquestion_unique_together.py`
   - New migration untuk remove constraint

3. **Backend Scripts**:
   - `backend/scripts/clean_all_questions.py`
   - Script untuk clean semua questions dari database

4. **Frontend State Management**:
   - `frontend/src/pages/dashboard/PackageDetailPage.jsx`
   - Enhanced useEffect untuk better state reset

## Testing Checklist

- [ ] Buat paket kuis baru
- [ ] Tambah beberapa pertanyaan ke paket pertama
- [ ] Buat paket kuis kedua
- [ ] Verifikasi daftar pertanyaan kosong di paket kedua
- [ ] Tambah pertanyaan ke paket kedua
- [ ] Switch bolak-balik antara paket 1 dan 2
- [ ] Verifikasi pertanyaan tidak tercampur
- [ ] Hapus pertanyaan dari salah satu paket
- [ ] Verifikasi delete berhasil tanpa error FOREIGN KEY
- [ ] Test upload gambar di kedua paket

## Clean Database (Development Only)

Untuk clean semua pertanyaan dari database:

```bash
# Dari root smartclassroom directory
cd smartclassroom/backend
python scripts/clean_all_questions.py
```

Script akan konfirmasi dulu sebelum delete:
- ⚠️  Yakin ingin menghapus SEMUA pertanyaan? (yes/no)
- Ketik 'yes' untuk proceed
