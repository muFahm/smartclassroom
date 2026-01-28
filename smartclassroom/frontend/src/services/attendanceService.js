/**
 * Service untuk manajemen absensi dengan integrasi ROS2 Face Recognition
 * 
 * ROS2 Topic Integration:
 * - Topic untuk menerima hasil face recognition akan dihubungkan di sini
 * - Format pesan yang diharapkan: { nim: string, name: string, confidence: number, timestamp: number }
 * 
 * Backend Integration:
 * - Data absensi disimpan ke database Django melalui REST API
 * - Endpoint: /api/attendance/
 */

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const ATTENDANCE_API = `${API_BASE_URL}/api/attendance`;

// Local cache untuk session aktif (mengurangi API calls)
const ATTENDANCE_CACHE_KEY = 'attendanceSessionCache';
const ATTENDANCE_HISTORY_KEY = 'attendanceHistory'; // Backup history lokal

// Status absensi
export const ATTENDANCE_STATUS = {
  NOT_MARKED: 'not_marked',
  HADIR: 'hadir',
  SAKIT: 'sakit',
  IZIN: 'izin',
  DISPENSASI: 'dispensasi',
  ALPHA: 'alpha',
};

// Status label untuk display
export const ATTENDANCE_STATUS_LABEL = {
  [ATTENDANCE_STATUS.NOT_MARKED]: 'Belum Absen',
  [ATTENDANCE_STATUS.HADIR]: 'Hadir',
  [ATTENDANCE_STATUS.SAKIT]: 'Sakit',
  [ATTENDANCE_STATUS.IZIN]: 'Izin',
  [ATTENDANCE_STATUS.DISPENSASI]: 'Dispensasi',
  [ATTENDANCE_STATUS.ALPHA]: 'Alpha',
};

// Status warna untuk styling
export const ATTENDANCE_STATUS_COLOR = {
  [ATTENDANCE_STATUS.NOT_MARKED]: '#94a3b8',
  [ATTENDANCE_STATUS.HADIR]: '#22c55e',
  [ATTENDANCE_STATUS.SAKIT]: '#f59e0b',
  [ATTENDANCE_STATUS.IZIN]: '#3b82f6',
  [ATTENDANCE_STATUS.DISPENSASI]: '#8b5cf6',
  [ATTENDANCE_STATUS.ALPHA]: '#ef4444',
};

// In-memory state untuk session absensi aktif
let activeSession = null;
let ros2Listener = null;
let faceRecognitionCallbacks = [];

// ==========================================
// API Helper Functions
// ==========================================

/**
 * Generic API request helper
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${ATTENDANCE_API}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  console.log('🌐 API Request:', options.method || 'GET', url);
  if (options.body) {
    console.log('📦 Request body:', options.body);
  }
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ API Error Response:', response.status, errorBody);
    const error = JSON.parse(errorBody).detail || errorBody || `API Error: ${response.status}`;
    throw new Error(typeof error === 'object' ? JSON.stringify(error) : error);
  }
  
  return response.json();
}

// ==========================================
// ROS2 Face Recognition Integration
// ==========================================

/**
 * Initialize ROS2 listener untuk face recognition
 * @param {Function} onFaceDetected - Callback ketika wajah terdeteksi
 */
export function initROS2FaceRecognition(onFaceDetected) {
  // TODO: Implementasi koneksi ke ROS2 topic
  // Menggunakan roslibjs atau rosbridge_suite
  
  /*
  Contoh implementasi dengan roslibjs:
  
  import ROSLIB from 'roslib';
  
  const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090' // rosbridge websocket
  });
  
  ros.on('connection', () => {
    console.log('Connected to ROS2 bridge');
  });
  
  ros.on('error', (error) => {
    console.error('ROS2 connection error:', error);
  });
  
  const faceRecognitionTopic = new ROSLIB.Topic({
    ros: ros,
    name: '/smartclassroom/face_recognition/result',
    messageType: 'std_msgs/msg/String'
  });
  
  faceRecognitionTopic.subscribe((message) => {
    const data = JSON.parse(message.data);
    onFaceDetected(data);
  });
  
  ros2Listener = { ros, topic: faceRecognitionTopic };
  */
  
  faceRecognitionCallbacks.push(onFaceDetected);
  console.log('ROS2 Face Recognition listener initialized (placeholder)');
  
  return {
    disconnect: () => {
      faceRecognitionCallbacks = faceRecognitionCallbacks.filter(cb => cb !== onFaceDetected);
      console.log('ROS2 Face Recognition listener disconnected');
    }
  };
}

/**
 * Simulate face detection (untuk testing tanpa ROS2)
 * @param {object} faceData - Data wajah yang terdeteksi
 */
export function simulateFaceDetection(faceData) {
  faceRecognitionCallbacks.forEach(callback => {
    callback({
      nim: faceData.nim,
      name: faceData.name,
      confidence: faceData.confidence || 0.95,
      timestamp: Date.now(),
    });
  });
}

// ==========================================
// Session Management - API Based
// ==========================================

/**
 * Create new attendance session
 * @param {object} courseInfo - Info mata kuliah
 * @param {Array} students - Daftar mahasiswa
 * @param {object} options - Additional options (lecturerId, lecturerName, selectedDate, dayName)
 * @returns {object} Session object
 */
export async function createAttendanceSession(courseInfo, students, options = {}) {
  try {
    console.log('🔍 DEBUG courseInfo received:', courseInfo);
    console.log('🔍 DEBUG students received:', students);
    console.log('🔍 DEBUG options received:', options);
    
    // Format students data untuk API
    // Note: Don't send photo data (base64) to API - it's too large and not a valid URL
    // Photos are stored separately in studentDataService
    const studentsData = students.map(student => ({
      student_id: student.nim,
      student_name: student.name || '',
      student_photo_url: '', // Photos stored locally, not in DB
      status: 'alpha', // Default status
    }));
    
    // Prepare session data - handle berbagai format field dari SIS API
    const startTime = courseInfo.JamMulai || courseInfo.mulai || null;
    const endTime = courseInfo.JamSelesai || courseInfo.selesai || null;
    
    // IdCourse digunakan untuk filter, KodeMk untuk display
    const courseId = courseInfo.IdCourse || courseInfo.id_course || '';
    const courseCode = courseInfo.KodeMk || courseInfo.courseCode || courseInfo.kode_mk || '';
    
    const sessionData = {
      course_id: courseId, // For filtering
      course_code: courseCode, // For display
      course_name: courseInfo.Matakuliah || courseInfo.courseName || courseInfo.matakuliah || courseInfo.nama_mk || '',
      class_name: courseInfo.class_name || courseInfo.Kelas || courseInfo.kelas || 'Unknown',
      lecturer_id: String(options.lecturerId || 'unknown'),
      lecturer_name: options.lecturerName || 'Unknown Lecturer',
      date: options.selectedDate || new Date().toISOString().split('T')[0],
      day_name: options.dayName || getDayName(new Date()),
      students: studentsData,
    };
    
    // Only add time fields if they have values (API rejects empty strings for TimeField)
    if (startTime) sessionData.start_time = startTime;
    if (endTime) sessionData.end_time = endTime;
    
    console.log('📤 Creating session via API:', sessionData);
    
    // Create session via API
    const createdSession = await apiRequest('/sessions/', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
    
    console.log('✅ Session created:', createdSession.id);
    
    // Transform API response to local format
    activeSession = transformApiSessionToLocal(createdSession);
    saveSessionToCache(activeSession);
    
    return activeSession;
  } catch (error) {
    console.error('❌ Error creating session:', error);
    
    // Fallback: create local session if API fails
    return createLocalSession(courseInfo, students, options);
  }
}

/**
 * Transform API session format to local format
 */
function transformApiSessionToLocal(apiSession) {
  return {
    id: apiSession.id,
    courseId: apiSession.course_id || apiSession.course_code, // IdCourse for filtering
    courseName: apiSession.course_name,
    courseCode: apiSession.course_code, // KodeMk for display
    className: apiSession.class_name,
    room: apiSession.room || '',
    date: apiSession.date,
    startTime: apiSession.start_time,
    endTime: apiSession.end_time,
    status: apiSession.status,
    lecturerId: apiSession.lecturer_id,
    lecturerName: apiSession.lecturer_name,
    dayName: apiSession.day_name,
    attendance: (apiSession.records || []).map(record => ({
      id: record.id,
      nim: record.student_id,
      name: record.student_name,
      photo: record.student_photo_url,
      status: record.status === 'alpha' && !record.face_recognized ? ATTENDANCE_STATUS.NOT_MARKED : record.status,
      markedAt: record.updated_at,
      markedBy: record.face_recognized ? 'face_recognition' : 'manual',
      confidence: record.confidence_score,
      notes: record.notes,
    })),
    createdAt: new Date(apiSession.created_at).getTime(),
    updatedAt: new Date(apiSession.updated_at).getTime(),
    stats: {
      total: apiSession.total_students,
      hadir: apiSession.present_count,
      sakit: apiSession.sick_count,
      izin: apiSession.izin_count,
      dispensasi: apiSession.permission_count,
      alpha: apiSession.absent_count,
    }
  };
}

/**
 * Create local session (fallback jika API gagal)
 */
function createLocalSession(courseInfo, students, options = {}) {
  const session = {
    id: `local_session_${Date.now()}`,
    courseId: courseInfo.IdCourse || courseInfo.KodeMk,
    courseName: courseInfo.Matakuliah || courseInfo.courseName,
    courseCode: courseInfo.KodeMk || courseInfo.courseCode,
    className: courseInfo.class_name || courseInfo.Kelas,
    room: courseInfo.KodeRuang,
    date: options.selectedDate || new Date().toISOString().split('T')[0],
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'active',
    lecturerId: options.lecturerId,
    lecturerName: options.lecturerName,
    dayName: options.dayName,
    attendance: students.map(student => ({
      nim: student.nim,
      name: student.name || null,
      photo: student.photo || null,
      status: ATTENDANCE_STATUS.NOT_MARKED,
      markedAt: null,
      markedBy: 'manual',
      confidence: null,
      notes: '',
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isLocal: true, // Flag untuk sync nanti
  };
  
  activeSession = session;
  saveSessionToCache(session);
  
  console.warn('⚠️ Created local session (API unavailable):', session.id);
  return session;
}

/**
 * Get helper function for day name
 */
function getDayName(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
}

/**
 * Get active session
 * @returns {object|null}
 */
export function getActiveSession() {
  if (activeSession) return activeSession;
  
  // Try to restore from cache
  const cached = getSessionFromCache();
  if (cached && cached.status === 'active') {
    activeSession = cached;
    return cached;
  }
  
  return null;
}

/**
 * Update attendance status for a student
 * @param {string} nim - NIM mahasiswa
 * @param {string} status - Status absensi
 * @param {string} markedBy - Ditandai oleh (manual/face_recognition)
 * @param {number} confidence - Confidence score (untuk face recognition)
 */
export async function updateAttendanceStatus(nim, status, markedBy = 'manual', confidence = null) {
  if (!activeSession) {
    console.warn('No active session');
    return null;
  }
  
  const studentIndex = activeSession.attendance.findIndex(s => s.nim === nim);
  if (studentIndex === -1) {
    console.warn('Student not found:', nim);
    return null;
  }
  
  const record = activeSession.attendance[studentIndex];
  
  // Update locally first
  activeSession.attendance[studentIndex] = {
    ...record,
    status,
    markedAt: new Date().toISOString(),
    markedBy,
    confidence,
  };
  activeSession.updatedAt = Date.now();
  saveSessionToCache(activeSession);
  
  // Update via API if we have record id
  if (record.id && !activeSession.isLocal) {
    try {
      await apiRequest(`/records/${record.id}/update_status/`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      console.log('✅ Status updated via API:', nim, status);
    } catch (error) {
      console.warn('⚠️ API update failed, status saved locally:', error);
    }
  }
  
  return activeSession.attendance[studentIndex];
}

/**
 * Update student info (name, photo)
 */
export function updateStudentInfo(nim, studentInfo) {
  if (!activeSession) return;
  
  const studentIndex = activeSession.attendance.findIndex(s => s.nim === nim);
  if (studentIndex === -1) return;
  
  activeSession.attendance[studentIndex] = {
    ...activeSession.attendance[studentIndex],
    name: studentInfo.name || activeSession.attendance[studentIndex].name,
    photo: studentInfo.photo || activeSession.attendance[studentIndex].photo,
  };
  
  saveSessionToCache(activeSession);
}

/**
 * Add notes to student attendance
 */
export function updateAttendanceNotes(nim, notes) {
  if (!activeSession) return null;
  
  const studentIndex = activeSession.attendance.findIndex(s => s.nim === nim);
  if (studentIndex === -1) return null;
  
  activeSession.attendance[studentIndex].notes = notes;
  activeSession.updatedAt = Date.now();
  saveSessionToCache(activeSession);
  
  return activeSession.attendance[studentIndex];
}

/**
 * Complete attendance session
 */
export async function completeSession() {
  if (!activeSession) return null;
  
  console.log('📋 Completing session:', activeSession.id);
  
  // Mark all NOT_MARKED as ALPHA
  activeSession.attendance = activeSession.attendance.map(student => {
    if (student.status === ATTENDANCE_STATUS.NOT_MARKED) {
      return {
        ...student,
        status: ATTENDANCE_STATUS.ALPHA,
        markedAt: new Date().toISOString(),
        markedBy: 'auto',
      };
    }
    return student;
  });
  
  activeSession.status = 'completed';
  activeSession.endTime = new Date().toISOString();
  activeSession.updatedAt = Date.now();
  
  // Complete via API
  if (!activeSession.isLocal) {
    try {
      // Bulk update all attendance statuses
      const updates = activeSession.attendance.map(s => ({
        student_id: s.nim,
        status: s.status,
        notes: s.notes || '',
      }));
      
      await apiRequest(`/sessions/${activeSession.id}/bulk-update/`, {
        method: 'POST',
        body: JSON.stringify({ updates }),
      });
      
      // Mark session as complete
      await apiRequest(`/sessions/${activeSession.id}/complete/`, {
        method: 'POST',
      });
      
      console.log('✅ Session completed via API');
    } catch (error) {
      console.warn('⚠️ API completion failed:', error);
    }
  }
  
  const completedSession = { ...activeSession };
  
  // Save to local history as backup (always do this)
  saveSessionToLocalHistory(completedSession);
  
  // Clear cache and active session
  clearSessionCache();
  activeSession = null;
  
  console.log('✅ Session completed:', completedSession.id);
  
  return completedSession;
}

/**
 * Cancel attendance session
 */
export async function cancelSession() {
  if (!activeSession) return;
  
  // Cancel via API
  if (!activeSession.isLocal && activeSession.id) {
    try {
      await apiRequest(`/sessions/${activeSession.id}/cancel/`, {
        method: 'POST',
      });
      console.log('✅ Session cancelled via API');
    } catch (error) {
      console.warn('⚠️ API cancellation failed:', error);
    }
  }
  
  clearSessionCache();
  activeSession = null;
}

/**
 * Get attendance statistics
 */
export function getAttendanceStats() {
  if (!activeSession) return null;
  
  const stats = {
    total: activeSession.attendance.length,
    hadir: 0,
    sakit: 0,
    izin: 0,
    dispensasi: 0,
    alpha: 0,
    notMarked: 0,
    faceRecognized: 0,
    manualMarked: 0,
  };
  
  activeSession.attendance.forEach(student => {
    switch (student.status) {
      case ATTENDANCE_STATUS.HADIR:
        stats.hadir++;
        break;
      case ATTENDANCE_STATUS.SAKIT:
        stats.sakit++;
        break;
      case ATTENDANCE_STATUS.IZIN:
        stats.izin++;
        break;
      case ATTENDANCE_STATUS.DISPENSASI:
        stats.dispensasi++;
        break;
      case ATTENDANCE_STATUS.ALPHA:
        stats.alpha++;
        break;
      default:
        stats.notMarked++;
    }
    
    if (student.markedBy === 'face_recognition') {
      stats.faceRecognized++;
    } else if (student.markedBy === 'manual') {
      stats.manualMarked++;
    }
  });
  
  return stats;
}

/**
 * Export session to JSON
 */
export function exportSessionToJSON(session = null) {
  const targetSession = session || activeSession;
  if (!targetSession) return null;
  
  const exportData = {
    ...targetSession,
    exportedAt: new Date().toISOString(),
    summary: getAttendanceStats(),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Download session as JSON file
 */
export function downloadSessionAsJSON(session = null) {
  const json = exportSessionToJSON(session);
  if (!json) return;
  
  const targetSession = session || activeSession;
  const filename = `absensi_${targetSession.courseCode}_${targetSession.date}.json`;
  
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// History - API Based
// ==========================================

/**
 * Get attendance history from API with local fallback
 * @param {object} filters - Filter options
 * @returns {Array} History sessions
 */
export async function getAttendanceHistory(filters = {}) {
  try {
    // Build query params
    const params = new URLSearchParams();
    
    if (filters.lecturerId) params.append('lecturer_id', filters.lecturerId);
    if (filters.courseId) {
      params.append('course_id', filters.courseId);
    }
    if (filters.courseCode) {
      params.append('course_code', filters.courseCode);
    }
    if (filters.className) params.append('class_name', filters.className);
    if (filters.startDate) params.append('date__gte', filters.startDate);
    if (filters.endDate) params.append('date__lte', filters.endDate);
    if (filters.status) params.append('status', filters.status);
    
    // Default: only completed sessions
    if (!filters.status) params.append('status', 'completed');
    
    const queryString = params.toString();
    const endpoint = `/sessions/${queryString ? '?' + queryString : ''}`;
    
    console.log('📚 Fetching history from API:', endpoint);
    
    const sessions = await apiRequest(endpoint);
    
    // Transform to local format
    const history = sessions.map(s => transformApiSessionToLocal(s));
    
    console.log('📊 History fetched from API:', history.length, 'sessions');
    
    // If API returns results, use them
    if (history.length > 0) {
      return history;
    }
    
    // Fallback to local history if API returns empty
    console.log('📦 API returned empty, checking local history...');
    return getLocalHistory(filters);
  } catch (error) {
    console.error('❌ Error fetching history from API:', error);
    // Fallback to local history on error
    console.log('📦 Falling back to local history...');
    return getLocalHistory(filters);
  }
}

/**
 * Get history for specific course
 */
export function getCourseAttendanceHistory(courseCode, lecturerId = null) {
  return getAttendanceHistory({ 
    courseCode, 
    lecturerId,
    status: 'completed' 
  });
}

/**
 * Get session detail with all records
 */
export async function getSessionDetail(sessionId) {
  try {
    console.log('📋 Fetching session detail:', sessionId);
    const session = await apiRequest(`/sessions/${sessionId}/`);
    return transformApiSessionToLocal(session);
  } catch (error) {
    console.error('❌ Error fetching session detail:', error);
    throw error;
  }
}

/**
 * Update attendance records in a session
 */
export async function updateSessionRecords(sessionId, attendanceData) {
  try {
    console.log('📝 Updating session records:', sessionId);
    console.log('📊 Attendance data to update:', attendanceData);
    
    let updateCount = 0;
    
    // Update each record via API
    for (const student of attendanceData) {
      if (student.id) {
        // Convert frontend status to backend valid choices
        // Backend accepts: 'hadir', 'sakit', 'izin', 'dispensasi', 'alpha'
        let backendStatus = student.status;
        if (student.status === ATTENDANCE_STATUS.NOT_MARKED) {
          backendStatus = 'alpha';
        } else if (!['hadir', 'sakit', 'izin', 'dispensasi', 'alpha'].includes(student.status)) {
          console.warn(`  Invalid status "${student.status}" for ${student.name}, defaulting to 'alpha'`);
          backendStatus = 'alpha';
        }
        
        console.log(`  Updating record ${student.id}: ${student.name} -> ${backendStatus} (from ${student.status})`);
        
        // Update existing record
        await apiRequest(`/records/${student.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: backendStatus,
            notes: student.notes || '',
          }),
        });
        updateCount++;
      } else {
        console.warn(`  Skipping student without ID: ${student.name}`);
      }
    }
    
    console.log(`✅ Session records updated: ${updateCount}/${attendanceData.length} records`);
    return true;
  } catch (error) {
    console.error('❌ Error updating session records:', error);
    throw error;
  }
}

/**
 * Get attendance history for student (untuk mahasiswa)
 */
export async function getStudentAttendanceHistory(studentId, courseCode = null) {
  try {
    let endpoint = `/student/${studentId}/history/`;
    if (courseCode) {
      endpoint += `?course_code=${courseCode}`;
    }
    
    const records = await apiRequest(endpoint);
    return records;
  } catch (error) {
    console.error('❌ Error fetching student history:', error);
    return [];
  }
}

/**
 * Get attendance summary for student
 */
export async function getStudentAttendanceSummary(studentId, courseCode = null) {
  try {
    let endpoint = `/student/${studentId}/summary/`;
    if (courseCode) {
      endpoint += `?course_code=${courseCode}`;
    }
    
    const summary = await apiRequest(endpoint);
    return summary;
  } catch (error) {
    console.error('❌ Error fetching student summary:', error);
    return null;
  }
}

// ==========================================
// Cache Management (untuk offline support)
// ==========================================

function saveSessionToCache(session) {
  try {
    // Create a lightweight version without photo data to avoid quota issues
    const lightSession = {
      ...session,
      attendance: session.attendance?.map(s => ({
        ...s,
        photo: undefined, // Don't store photos in cache
      })),
    };
    localStorage.setItem(ATTENDANCE_CACHE_KEY, JSON.stringify(lightSession));
  } catch (error) {
    console.error('Error saving session to cache:', error);
    // Try to clear old data and retry
    try {
      localStorage.removeItem(ATTENDANCE_HISTORY_KEY);
      localStorage.setItem(ATTENDANCE_CACHE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Still cannot save after cleanup:', e);
    }
  }
}

function getSessionFromCache() {
  try {
    const cached = localStorage.getItem(ATTENDANCE_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error reading session from cache:', error);
    return null;
  }
}

function clearSessionCache() {
  localStorage.removeItem(ATTENDANCE_CACHE_KEY);
}

/**
 * Save session to local history (backup)
 */
function saveSessionToLocalHistory(session) {
  try {
    // Create lightweight version without photo data
    const lightSession = {
      ...session,
      attendance: session.attendance?.map(s => ({
        ...s,
        photo: undefined, // Don't store photos in history
      })),
    };
    
    let history = JSON.parse(localStorage.getItem(ATTENDANCE_HISTORY_KEY) || '[]');
    
    // Check if session already exists (update) or new
    const existingIndex = history.findIndex(s => s.id === session.id);
    if (existingIndex !== -1) {
      history[existingIndex] = lightSession;
    } else {
      history.push(lightSession);
    }
    
    // Keep only last 20 sessions to save space
    while (history.length > 20) {
      history.shift();
    }
    
    localStorage.setItem(ATTENDANCE_HISTORY_KEY, JSON.stringify(history));
    console.log('💾 Session saved to local history:', session.id, '| Total:', history.length);
  } catch (error) {
    console.error('❌ Error saving session to local history:', error);
    // Try to clear and save only current session
    try {
      localStorage.setItem(ATTENDANCE_HISTORY_KEY, JSON.stringify([session]));
      console.log('💾 Cleared old history and saved current session');
    } catch (e) {
      console.error('❌ Cannot save even after cleanup:', e);
    }
  }
}

/**
 * Get local history with filters
 */
function getLocalHistory(filters = {}) {
  try {
    const historyJson = localStorage.getItem(ATTENDANCE_HISTORY_KEY);
    const history = JSON.parse(historyJson || '[]');
    
    console.log('📦 Local history total:', history.length);
    
    let filtered = history.filter(s => s.status === 'completed');
    
    if (filters.courseId || filters.courseCode) {
      const code = filters.courseId || filters.courseCode;
      filtered = filtered.filter(s => s.courseCode === code || s.courseId === code);
    }
    
    if (filters.lecturerId) {
      filtered = filtered.filter(s => s.lecturerId === filters.lecturerId);
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(s => s.date >= filters.startDate);
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(s => s.date <= filters.endDate);
    }
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('📦 Local history filtered:', filtered.length);
    
    return filtered;
  } catch (error) {
    console.error('❌ Error reading local history:', error);
    return [];
  }
}

// ==========================================
// ROS2 Face Recognition Event Handler
// ==========================================

/**
 * Handle face recognition result from ROS2
 * Automatically marks student as HADIR when face is recognized
 */
export async function handleFaceRecognitionResult(faceData) {
  if (!activeSession) {
    console.warn('No active session for face recognition');
    return;
  }
  
  const { nim, name, confidence } = faceData;
  
  const student = activeSession.attendance.find(s => s.nim === nim);
  if (!student) {
    console.warn('Student not found in session:', nim);
    return;
  }
  
  // Only update if not already marked as present
  if (student.status === ATTENDANCE_STATUS.NOT_MARKED || student.status === ATTENDANCE_STATUS.ALPHA) {
    await updateAttendanceStatus(nim, ATTENDANCE_STATUS.HADIR, 'face_recognition', confidence);
    
    // Update name if provided and not already set
    if (name && !student.name) {
      updateStudentInfo(nim, { name });
    }
    
    // If we have record ID, also update face recognition fields via API
    if (student.id && !activeSession.isLocal) {
      try {
        await apiRequest(`/records/${student.id}/face_recognition/`, {
          method: 'POST',
          body: JSON.stringify({ confidence_score: confidence }),
        });
      } catch (error) {
        console.warn('⚠️ API face recognition update failed:', error);
      }
    }
    
    console.log(`Face recognized: ${nim} (${name}) - Confidence: ${confidence}`);
  }
}

export default {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_COLOR,
  initROS2FaceRecognition,
  simulateFaceDetection,
  createAttendanceSession,
  getActiveSession,
  updateAttendanceStatus,
  updateStudentInfo,
  updateAttendanceNotes,
  completeSession,
  cancelSession,
  getAttendanceStats,
  exportSessionToJSON,
  downloadSessionAsJSON,
  getAttendanceHistory,
  getCourseAttendanceHistory,
  getStudentAttendanceHistory,
  getStudentAttendanceSummary,
  handleFaceRecognitionResult,
};
