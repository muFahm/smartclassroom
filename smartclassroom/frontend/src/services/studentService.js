// Service to fetch user photos (student and lecturer) from SIS Trisakti API

const SIS_TOKEN = process.env.REACT_APP_SIS_TOKEN || "OEdUVkg1bW5ac1Bhb25YZ1VlQzNqZz09";

// Cache keys
const LECTURER_PHOTO_CACHE_KEY = 'lecturerPhotoCache_user';
const CACHE_EXPIRY_DAYS = 7;

/**
 * Determine program code based on NIM prefix
 * @param {string} nim - Student NIM
 * @returns {string} Program code (0650 or 0641)
 */
export const getProgramCode = (nim) => {
  if (!nim) return null;
  
  // NIM prefix 0640 -> program 0641, prefix 0650 -> program 0650
  if (nim.startsWith("0640")) return "0641";
  if (nim.startsWith("0650")) return "0650";
  
  // Default fallback
  return "0650";
};

/**
 * Determine angkatan (enrollment year) based on NIM
 * @param {string} nim - Student NIM
 * @returns {string} Angkatan in format "YYYY/YYYY-1"
 */
export const getAngkatan = (nim) => {
  if (!nim || nim.length < 8) return "2022/2023-1";
  
  // Extract year from NIM (usually positions 5-6)
  // Example NIM: 065021200003 -> 21 means 2021
  const yearDigits = nim.substring(4, 6);
  const year = parseInt("20" + yearDigits);
  
  if (isNaN(year) || year < 2010 || year > 2030) {
    return "2022/2023-1";
  }
  
  return `${year}/${year + 1}-1`;
};

/**
 * Get cached lecturer photo from localStorage
 */
function getLecturerPhotoFromCache(staffId) {
  try {
    const cached = localStorage.getItem(LECTURER_PHOTO_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    
    // Check expiry
    const now = Date.now();
    if (data.expiry && now > data.expiry) {
      localStorage.removeItem(LECTURER_PHOTO_CACHE_KEY);
      return null;
    }

    return data.photos?.[staffId] || null;
  } catch (error) {
    console.error('Error reading lecturer photo cache:', error);
    return null;
  }
}

/**
 * Save lecturer photo to localStorage cache
 */
function saveLecturerPhotoToCache(staffId, photo) {
  try {
    const cached = localStorage.getItem(LECTURER_PHOTO_CACHE_KEY);
    const data = cached ? JSON.parse(cached) : { photos: {} };
    
    data.photos = data.photos || {};
    data.photos[staffId] = photo;
    data.expiry = Date.now() + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    localStorage.setItem(LECTURER_PHOTO_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving lecturer photo cache:', error);
  }
}

/**
 * Fetch lecturer photo by searching through course data
 * Since dosen API requires IdCourse, we try common course IDs or use cached data
 * @param {string} staffId - Staff ID of the lecturer
 * @returns {Promise<string|null>} Photo path or null
 */
export const fetchLecturerPhoto = async (staffId) => {
  if (!staffId) {
    console.warn("fetchLecturerPhoto: staffId is missing");
    return null;
  }

  // Check cache first
  const cached = getLecturerPhotoFromCache(staffId);
  if (cached) {
    console.log("Using cached lecturer photo for:", staffId);
    return cached;
  }

  try {
    // Try to find lecturer photo from existing lecturer cache in localStorage
    const lecturerCache = localStorage.getItem('lecturerPhotoCache');
    if (lecturerCache) {
      const cacheData = JSON.parse(lecturerCache);
      const courses = cacheData.courses || {};
      
      // Search through all cached courses for this staff
      for (const courseId of Object.keys(courses)) {
        const courseData = courses[courseId];
        if (courseData?.lecturers) {
          for (const lecturer of courseData.lecturers) {
            if (lecturer.id === staffId || String(lecturer.id) === String(staffId)) {
              if (lecturer.photo) {
                console.log("Found lecturer photo in course cache:", courseId);
                saveLecturerPhotoToCache(staffId, lecturer.photo);
                return lecturer.photo;
              }
            }
          }
        }
      }
    }

    console.log("Lecturer photo not found in cache for:", staffId);
    return null;
  } catch (error) {
    console.error("Error fetching lecturer photo:", error);
    return null;
  }
};

/**
 * Store student photo in sessionStorage (legacy, kept for compatibility)
 * @param {string} photo - Base64 photo data
 */
export const cacheStudentPhoto = (photo) => {
  if (photo) {
    sessionStorage.setItem("studentPhoto", photo);
  }
};

/**
 * Get cached student photo from sessionStorage (legacy)
 * @returns {string|null} Cached photo or null
 */
export const getCachedPhoto = () => {
  return sessionStorage.getItem("studentPhoto");
};

/**
 * Clear cached student photo
 */
export const clearCachedPhoto = () => {
  sessionStorage.removeItem("studentPhoto");
};
