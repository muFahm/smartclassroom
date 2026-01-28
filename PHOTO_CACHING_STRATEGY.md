# Strategi Caching Foto Mahasiswa

## Problem yang Diselesaikan
- **localStorage quota exceeded** - Foto base64 terlalu besar (~50-100KB per foto)
- 37 mahasiswa × 100KB = ~3.7MB → melebihi limit localStorage (5-10MB)

## Solusi yang Diterapkan

### 1. Two-Tier Caching System

#### **Tier 1: Memory Cache (In-Memory Map)**
- **Location**: JavaScript `Map()` object dalam memori browser
- **Lifetime**: Selama tab browser terbuka
- **Content**: Nama + Foto base64 lengkap
- **Advantage**: 
  - Tidak ada limit size
  - Akses sangat cepat
  - Foto langsung tersedia saat sudah dimuat

#### **Tier 2: localStorage Cache**
- **Location**: Browser localStorage
- **Lifetime**: 7 hari (configurable)
- **Content**: **HANYA NAMA** (tanpa foto)
- **Purpose**: Untuk menampilkan nama mahasiswa meski foto belum dimuat

### 2. Lazy Loading Strategy

```javascript
// Flow saat load mahasiswa:
1. Cek memory cache → jika ada, pakai langsung (nama + foto)
2. Jika tidak ada, cek localStorage → dapat nama, foto = null
3. Tampilkan nama dulu (tanpa foto)
4. Fetch foto dari API secara async
5. Update memory cache dengan foto
6. Update UI dengan foto yang baru dimuat
```

### 3. Batch Fetching dengan Rate Limiting

```javascript
// Max 5 concurrent requests
fetchMultipleStudents(nims, onProgress)
  - Split menjadi batch @ 5 requests
  - Fetch secara parallel per batch
  - Sequential antar batch
```

## Behavior yang User Lihat

### ✅ Normal Flow:
1. **Load halaman** → Nama mahasiswa langsung muncul dari localStorage
2. **Foto loading** → Foto muncul secara bertahap (1-2 detik per foto)
3. **Refresh page** → Nama tetap muncul, foto dimuat ulang dari API
4. **Dalam 1 session** → Foto di-cache di memory, load instant

### ⚠️ Known Limitations:
- **Foto tidak persisten** - Setiap refresh browser, foto dimuat ulang dari API
- **Internet required** - Foto butuh koneksi untuk fetch dari SIS API
- **Load time** - 37 mahasiswa × 1-2 detik = ~1-2 menit total loading time

## Optimizations Applied

### 1. Prevent Duplicate Requests
```javascript
const pendingRequests = new Map();
// Jika NIM sedang di-fetch, return promise yang sama
```

### 2. Progressive Loading
```javascript
onProgress={(loaded, total) => {
  console.log(`Loaded ${loaded}/${total} students`);
}}
```

### 3. Fallback Gracefully
```javascript
// Jika foto gagal load:
- Nama tetap ditampilkan
- Avatar placeholder muncul (UI-avatars)
- Error tidak block UI
```

## Future Improvements (Optional)

### 1. Backend Proxy Cache
```python
# Django view untuk cache foto di server
@api_view(['GET'])
def get_student_photo(request, nim):
    # Check Redis cache
    cached = redis.get(f'photo:{nim}')
    if cached:
        return Response(cached)
    
    # Fetch dari SIS API
    photo = fetch_from_sis(nim)
    
    # Cache 1 hari
    redis.setex(f'photo:{nim}', 86400, photo)
    return Response(photo)
```

**Benefit**: 
- Faster loading (server → client lebih cepat)
- Reduce SIS API load
- Centralized caching

### 2. IndexedDB Instead of Memory
```javascript
// Store foto di IndexedDB (100MB+ limit)
const db = await openDB('photos', 1);
await db.put('photos', { nim, photo, timestamp });
```

**Benefit**:
- Foto persisten antar refresh
- Limit lebih besar (50-100MB)
- Async operation (tidak block UI)

### 3. CDN Storage
- Upload foto ke CDN (Cloudinary, AWS S3)
- Store URL instead of base64
- Much faster loading

## Configuration

File: `studentDataService.js`

```javascript
const CACHE_EXPIRY_DAYS = 7;        // localStorage cache duration
const MAX_CONCURRENT = 5;            // Parallel fetch limit
const CACHE_VERSION = 'v2';          // Increment to invalidate cache
```

## Monitoring & Debug

### Console Logs:
```
✅ "Loading photo for student: 064102500001"
✅ "Student photo cached: 064102500001"
⚠️  "Student photo not found in cache for: 064102500001"
❌ "Error fetching student 064102500001: Network error"
```

### Performance Metrics:
- **First paint**: < 1 second (nama muncul)
- **Photo load**: 1-2 seconds per photo
- **Total load**: ~1-2 minutes for 37 students
- **Memory usage**: ~10-15MB for all photos in memory

## Summary

**Trade-off yang dipilih**:
- ❌ Foto tidak persisten (reload = fetch ulang)
- ✅ Nama persisten (localStorage)
- ✅ Tidak ada localStorage quota error
- ✅ Memory usage reasonable
- ✅ Progressive loading (UX tetap responsive)

**Alternatif yang TIDAK dipilih**:
- ❌ Store base64 di localStorage → Quota exceeded
- ❌ Fetch ulang setiap kali → Terlalu lambat
- ❌ No caching → Network overhead tinggi
