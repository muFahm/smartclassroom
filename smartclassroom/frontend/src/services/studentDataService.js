/**
 * Service untuk fetch dan cache data mahasiswa (nama + foto)
 */

import { parseNIM } from '../utils/nimParser';

const CACHE_KEY = 'studentDataCache';
const CACHE_VERSION = 'v2';
const CACHE_EXPIRY_DAYS = 7;

// In-memory cache untuk session saat ini
const memoryCache = new Map();

// Fetch queue untuk menghindari duplicate requests
const pendingRequests = new Map();

/**
 * Get cache dari localStorage
 */
function getCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};

    const data = JSON.parse(cached);
    if (data.version !== CACHE_VERSION) return {};

    // Check expiry
    const now = Date.now();
    if (data.expiry && now > data.expiry) {
      localStorage.removeItem(CACHE_KEY);
      return {};
    }

    return data.students || {};
  } catch (error) {
    console.error('Error reading cache:', error);
    return {};
  }
}

/**
 * Save cache ke localStorage (tanpa foto untuk menghemat ruang)
 */
function saveCache(studentsData) {
  try {
    const expiry = Date.now() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    // Strip foto dari data untuk menghemat localStorage
    const lightweightData = {};
    for (const [nim, student] of Object.entries(studentsData)) {
      lightweightData[nim] = {
        nim: student.nim,
        name: student.name,
        // photo: tidak disimpan ke localStorage
        fetchedAt: student.fetchedAt,
      };
    }
    
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        version: CACHE_VERSION,
        expiry,
        students: lightweightData,
      })
    );
  } catch (error) {
    // Jika masih gagal, clear cache dan jangan simpan
    console.warn('localStorage full, clearing student cache');
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Get student data dari cache (memory atau localStorage)
 */
export function getStudentFromCache(nim) {
  // Check memory cache first
  if (memoryCache.has(nim)) {
    return memoryCache.get(nim);
  }

  // Check localStorage
  const cache = getCache();
  if (cache[nim]) {
    memoryCache.set(nim, cache[nim]);
    return cache[nim];
  }

  return null;
}

/**
 * Fetch student data dari API
 */
export async function fetchStudentData(nim) {
  // Check cache first
  const cached = getStudentFromCache(nim);
  if (cached) {
    return cached;
  }

  // Check if already fetching
  if (pendingRequests.has(nim)) {
    return pendingRequests.get(nim);
  }

  // Parse NIM
  const { program, angkatan, isValid } = parseNIM(nim);
  if (!isValid) {
    console.warn('Invalid NIM format:', nim);
    return { nim, name: null, photo: null, error: 'Invalid NIM' };
  }

  // Create fetch promise
  const fetchPromise = (async () => {
    try {
      const token = process.env.REACT_APP_SIS_TOKEN || 'XX';
      const url = `https://sis.trisakti.ac.id/api/get-foto-mahasiswa?program=${program}&angkatan=${angkatan}&token=${token}&nim=${nim}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // API returns array with single element
      const student = Array.isArray(data) && data.length > 0 ? data[0] : data;
      
      // Extract student data from response
      const studentData = {
        nim,
        name: student?.nama || student?.name || student?.NamaMhs || null,
        photo: student?.photo || student?.foto || student?.Photo || null,
        fetchedAt: Date.now(),
      };

      // Save to cache
      memoryCache.set(nim, studentData);
      const cache = getCache();
      cache[nim] = studentData;
      saveCache(cache);

      return studentData;
    } catch (error) {
      console.error(`Error fetching student ${nim}:`, error);
      const errorData = { nim, name: null, photo: null, error: error.message };
      
      // Cache error result temporarily (don't retry immediately)
      memoryCache.set(nim, errorData);
      return errorData;
    } finally {
      pendingRequests.delete(nim);
    }
  })();

  pendingRequests.set(nim, fetchPromise);
  return fetchPromise;
}

/**
 * Batch fetch multiple students dengan rate limiting
 * Max concurrent requests: 5
 */
export async function fetchMultipleStudents(nims, onProgress = null) {
  const MAX_CONCURRENT = 5;
  const results = new Map();

  // Filter out NIMs already in cache
  const nimsToFetch = nims.filter((nim) => !getStudentFromCache(nim));

  if (nimsToFetch.length === 0) {
    // All in cache
    return new Map(nims.map((nim) => [nim, getStudentFromCache(nim)]));
  }

  // Process in batches
  for (let i = 0; i < nimsToFetch.length; i += MAX_CONCURRENT) {
    const batch = nimsToFetch.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map((nim) => fetchStudentData(nim));

    const batchResults = await Promise.allSettled(promises);

    batchResults.forEach((result, index) => {
      const nim = batch[index];
      if (result.status === 'fulfilled') {
        results.set(nim, result.value);
      } else {
        results.set(nim, { nim, name: null, photo: null, error: result.reason });
      }
    });

    if (onProgress) {
      onProgress(Math.min(i + MAX_CONCURRENT, nimsToFetch.length), nimsToFetch.length);
    }
  }

  // Add cached results
  nims.forEach((nim) => {
    if (!results.has(nim)) {
      results.set(nim, getStudentFromCache(nim));
    }
  });

  return results;
}

/**
 * Clear cache (untuk debugging/testing)
 */
export function clearStudentCache() {
  memoryCache.clear();
  localStorage.removeItem(CACHE_KEY);
}
