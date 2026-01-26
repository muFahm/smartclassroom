# Student Data Fetching Implementation

## Overview
Implementasi sistem fetch nama mahasiswa dari API dengan mekanisme **cache + lazy loading** untuk performa optimal.

## Arsitektur

### 1. **NIM Parser** (`utils/nimParser.js`)
Parse NIM mahasiswa untuk mendapatkan program dan angkatan.

**Format NIM:** `PPPTTAAUUU`
- `PPP`: Kode Prodi (064 = IF/0641, 065 = SI/0650)
- `TT`: Tahun angkatan (22 = 2022/2023-1, 24 = 2024/2025-1)
- `AA` + `UUU`: Angka unik mahasiswa

**Contoh:**
```javascript
parseNIM('064002200036')
// → { program: '0641', angkatan: '2022/2023-1', isValid: true }

parseNIM('065002400012')
// → { program: '0650', angkatan: '2024/2025-1', isValid: true }
```

### 2. **Student Data Service** (`services/studentDataService.js`)

#### Features:
- **Dual Cache**: Memory cache (session) + localStorage (persistent 7 hari)
- **Deduplication**: Mencegah duplicate requests untuk NIM yang sama
- **Batch Fetching**: Max 5 concurrent requests
- **Error Handling**: Cache error result sementara (tidak retry langsung)

#### API Endpoint:
```
POST https://sis.trisakti.ac.id/api/get-foto-mahasiswa
Query params:
  - program: 0641 (IF) atau 0650 (SI)
  - angkatan: 2022/2023-1
  - token: XX
  - nim: 064002200036
```

#### Main Functions:

**`getStudentFromCache(nim)`**
- Cek cache (memory → localStorage)
- Return: `{ nim, name, photo, fetchedAt }` atau `null`

**`fetchStudentData(nim)`**
- Fetch single student dari API
- Auto-cache hasil
- Return: Promise dengan student data

**`fetchMultipleStudents(nims, onProgress)`**
- Batch fetch dengan rate limiting (5 concurrent)
- Progress callback optional
- Return: Promise dengan Map<nim, studentData>

**`clearStudentCache()`**
- Clear semua cache (untuk debugging)

### 3. **Component Integration** (`ClassOverviewDetail.jsx`)

#### State Management:
```javascript
const [studentData, setStudentData] = useState(new Map());
const [loadingStudents, setLoadingStudents] = useState(false);
```

#### Fetch Logic:
- Trigger: Saat user memilih mata kuliah (`selectedCourse` berubah)
- Check cache dulu, hanya fetch yang belum ada
- Update UI secara lazy (tampilkan NIM dulu, replace dengan nama setelah loaded)

#### UI Rendering:
```jsx
{(selectedCourse?.Std || []).map((student) => {
  const nim = student?.nim;
  const studentInfo = studentData.get(nim);
  const displayName = studentInfo?.name || nim; // Fallback ke NIM
  
  return (
    <div className="person-row">
      <div className="avatar">
        {studentInfo?.name ? buildInitials(studentInfo.name) : buildInitials(nim)}
      </div>
      <div>
        <strong>{displayName}</strong>
        <div className="muted">
          {isLoading ? "Memuat..." : studentInfo?.name ? nim : "Mahasiswa"}
        </div>
      </div>
    </div>
  );
})}
```

## Performance Optimization

### 1. **Cache Strategy**
- **First load**: Fetch dari API → cache ke memory + localStorage
- **Subsequent loads**: Ambil langsung dari cache (instant)
- **Cross-page**: Cache shared antar halaman (1x fetch untuk semua)
- **Expiry**: 7 hari, auto-clear jika expired

### 2. **Rate Limiting**
- Max 5 concurrent requests
- Prevents overwhelming API server
- Batch processing untuk kelas besar

### 3. **Progressive Loading**
- Tampilkan NIM dulu (instant)
- Replace dengan nama setelah fetch selesai
- No blocking UI

### 4. **Deduplication**
- Satu NIM hanya di-fetch 1x per session
- Duplicate requests di-merge (await promise yang sama)

## Example Scenarios

### Scenario 1: First Time Load
```
User pilih mata kuliah → 30 mahasiswa
├─ Check cache → 0 found
├─ Batch 1 (5 requests) → fetch
├─ Batch 2 (5 requests) → fetch
├─ Batch 3 (5 requests) → fetch
├─ ... (total 6 batches)
└─ Save to cache → done

Time: ~3-5 detik (tergantung API response time)
```

### Scenario 2: Cached Load
```
User pilih mata kuliah → 30 mahasiswa
├─ Check cache → 30 found
└─ Load from cache → instant

Time: < 100ms
```

### Scenario 3: Partial Cache
```
User pilih mata kuliah → 30 mahasiswa
├─ Check cache → 25 found
├─ Fetch missing 5 → 1 batch
└─ Done

Time: ~500ms - 1 detik
```

## API Response Handling

Service mengekspektasi response format:
```json
{
  "nama": "John Doe",  // atau "name", "NamaMhs"
  "foto": "url",       // atau "photo", "Photo"
  // ... other fields
}
```

Fallback chain untuk nama:
```javascript
data?.nama || data?.name || data?.NamaMhs || null
```

## Cache Management

### Lokasi:
- **Memory**: `Map` object dalam service
- **localStorage**: Key `studentDataCache`

### Structure:
```json
{
  "version": "v1",
  "expiry": 1738243200000,
  "students": {
    "064002200036": {
      "nim": "064002200036",
      "name": "John Doe",
      "photo": "url",
      "fetchedAt": 1737638400000
    }
  }
}
```

### Clear Cache:
```javascript
import { clearStudentCache } from '@/services/studentDataService';
clearStudentCache(); // Clear all
```

## Future Improvements

1. **Bulk API**: Request endpoint yang terima array NIMs
   ```
   POST /get-foto-mahasiswa-bulk
   Body: { nims: ["064002200036", "064002200037", ...] }
   ```

2. **Virtualization**: Untuk kelas dengan > 100 mahasiswa, render hanya yang visible

3. **Background Sync**: Fetch data di background saat idle

4. **IndexedDB**: Untuk cache lebih besar (> 5MB localStorage limit)

5. **Service Worker**: Offline support & background sync

## Troubleshooting

### Student names not loading?
1. Check browser console untuk API errors
2. Verify NIM format (harus 12 digit)
3. Check localStorage quota (mungkin full)
4. Try `clearStudentCache()` dan reload

### Performance slow?
1. Reduce MAX_CONCURRENT (default 5)
2. Check network tab untuk slow API
3. Verify cache working (should be instant on 2nd load)

### Cache not working?
1. Check browser localStorage enabled
2. Verify CACHE_KEY tidak konflik
3. Check cache expiry (default 7 days)
