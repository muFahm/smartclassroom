/**
 * Service untuk fetch dan cache foto dosen berdasarkan IdCourse
 */

const CACHE_KEY = 'lecturerPhotoCache';
const CACHE_VERSION = 'v1';
const CACHE_EXPIRY_DAYS = 7;

const memoryCache = new Map();
const pendingRequests = new Map();

function getCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};

    const data = JSON.parse(cached);
    if (data.version !== CACHE_VERSION) return {};

    const now = Date.now();
    if (data.expiry && now > data.expiry) {
      localStorage.removeItem(CACHE_KEY);
      return {};
    }

    return data.courses || {};
  } catch (error) {
    console.error('Error reading lecturer cache:', error);
    return {};
  }
}

function saveCache(coursesData) {
  try {
    const expiry = Date.now() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        version: CACHE_VERSION,
        expiry,
        courses: coursesData,
      })
    );
  } catch (error) {
    console.error('Error saving lecturer cache:', error);
  }
}

export function getLecturersFromCache(idCourse) {
  if (memoryCache.has(idCourse)) {
    return memoryCache.get(idCourse);
  }

  const cache = getCache();
  if (cache[idCourse]) {
    memoryCache.set(idCourse, cache[idCourse]);
    return cache[idCourse];
  }

  return null;
}

export async function fetchLecturersByCourse(idCourse) {
  const cached = getLecturersFromCache(idCourse);
  if (cached) {
    return cached;
  }

  if (pendingRequests.has(idCourse)) {
    return pendingRequests.get(idCourse);
  }

  const fetchPromise = (async () => {
    try {
      const token = process.env.REACT_APP_SIS_TOKEN || 'XX';
      const url = `https://sis.trisakti.ac.id/api/get-foto-dosen?token=${encodeURIComponent(
        token,
      )}&IdCourse=${encodeURIComponent(idCourse)}`;

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
      const lecturers = Array.isArray(data) ? data : [data];

      const normalized = lecturers
        .filter(Boolean)
        .map((item) => ({
          id: item?.IdStaff || item?.StaffId || item?.id || item?.IdDosen || null,
          name: item?.nama || item?.name || item?.NamaDosen || item?.StaffName || null,
          photo: item?.photo || item?.foto || item?.Photo || null,
          fetchedAt: Date.now(),
        }))
        .filter((item) => item.id);

      const result = {
        idCourse,
        lecturers: normalized,
        fetchedAt: Date.now(),
      };

      memoryCache.set(idCourse, result);
      const cache = getCache();
      cache[idCourse] = result;
      saveCache(cache);

      return result;
    } catch (error) {
      console.error(`Error fetching lecturers for course ${idCourse}:`, error);
      const errorData = { idCourse, lecturers: [], error: error.message };
      memoryCache.set(idCourse, errorData);
      return errorData;
    } finally {
      pendingRequests.delete(idCourse);
    }
  })();

  pendingRequests.set(idCourse, fetchPromise);
  return fetchPromise;
}

export function clearLecturerCache() {
  memoryCache.clear();
  localStorage.removeItem(CACHE_KEY);
}
