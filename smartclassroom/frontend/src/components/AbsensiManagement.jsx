import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Play,
  Square,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL,
  createAttendanceSession,
  getActiveSession,
  updateAttendanceStatus,
  updateStudentInfo,
  completeSession,
  cancelSession,
  getAttendanceStats,
  downloadSessionAsJSON,
  initROS2FaceRecognition,
  handleFaceRecognitionResult,
  getAttendanceHistory,
  getSessionDetail,
  updateSessionRecords,
} from "../services/attendanceService";
import { fetchMultipleStudents, getStudentFromCache } from "../services/studentDataService";
import { fetchLecturersByCourse, getLecturersFromCache } from "../services/lecturerDataService";
import "./AbsensiManagement.css";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SIS_TOKEN = process.env.REACT_APP_SIS_TOKEN || "XX";
const SIS_SEMESTER = process.env.REACT_APP_SIS_SEMESTER || "20251";
const SIS_PROGRAMS = ["0641", "0650"];
const SIS_BASE_URL = "https://sis.trisakti.ac.id/api/get-data-kelas";

const formatTime = (time) => time?.slice(0, 5) || "-";

const buildInitials = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

const getPhotoPlaceholder = (name = "User") =>
  `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(
    name,
  )}`;

const resolvePhotoSrc = (photo) => {
  if (!photo) return null;
  if (photo.startsWith("data:")) return photo;
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  return `data:image/jpeg;base64,${photo}`;
};

export default function AbsensiManagement() {
  const { classId } = useParams();
  
  // Get logged-in user (lecturer) data
  const getUser = () => {
    try {
      const userStr = sessionStorage.getItem('user');
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };
  
  const user = getUser();
  const lecturerId = user?.staff_id || user?.staffId || user?.id || user?.lecturer_id;
  
  // Debug: Log user and lecturerId on mount
  useEffect(() => {
    console.log('👤 User data:', user);
    console.log('🆔 Lecturer ID:', lecturerId);
    console.log('📋 User keys:', user ? Object.keys(user) : 'no user');
    if (!lecturerId) {
      console.warn('⚠️ No lecturer ID found in user session!');
      console.warn('⚠️ Trying all possible ID fields:');
      console.warn('  - staff_id:', user?.staff_id);
      console.warn('  - staffId:', user?.staffId);
      console.warn('  - id:', user?.id);
      console.warn('  - lecturer_id:', user?.lecturer_id);
    }
  }, []);

  // Data states
  const [classData, setClassData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [studentData, setStudentData] = useState(new Map());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [lecturerData, setLecturerData] = useState(new Map());
  const [loadingLecturers, setLoadingLecturers] = useState(false);

  // Attendance session states
  const [session, setSession] = useState(null);
  const [isFaceRecognitionActive, setIsFaceRecognitionActive] = useState(false);
  const [ros2Connection, setRos2Connection] = useState(null);

  // UI states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [expandedDropdown, setExpandedDropdown] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // History filter & edit states
  const [historyFilter, setHistoryFilter] = useState({ courseId: '', startDate: '', endDate: '' });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editAttendance, setEditAttendance] = useState([]);

  // Load class data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const results = await Promise.all(
          SIS_PROGRAMS.map((program) => {
            const url = `${SIS_BASE_URL}?token=${encodeURIComponent(
              SIS_TOKEN,
            )}&program=${encodeURIComponent(program)}&semester=${encodeURIComponent(
              SIS_SEMESTER,
            )}`;
            return fetch(url, { method: "POST" }).then((res) => {
              if (!res.ok) {
                throw new Error(`Gagal memuat data program ${program}`);
              }
              return res.json();
            });
          }),
        );

        if (!isMounted) return;

        const merged = results.reduce((acc, item) => ({ ...acc, ...item }), {});
        setClassData(merged);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Gagal memuat data kelas.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Restore active session on mount
  useEffect(() => {
    const activeSession = getActiveSession();
    if (activeSession) {
      setSession(activeSession);
      setSelectedCourseId(activeSession.courseId);
    }
  }, []);

  // Filter classes by room
  const classEntries = useMemo(() => {
    const entries = Object.values(classData || {});
    return entries.filter((entry) => {
      const room = entry?.kelas?.KodeRuang || "";
      return classId ? room.endsWith(classId) : true;
    });
  }, [classId, classData]);

  // Get today's entries
  const selectedDayName = WEEKDAY_NAMES[selectedDate.getDay()];
  const dayEntries = useMemo(() => {
    return classEntries
      .filter((entry) => entry?.kelas?.hari === selectedDayName)
      .sort(
        (a, b) =>
          parseInt(a?.kelas?.mulai?.replace(":", "") || 0) -
          parseInt(b?.kelas?.mulai?.replace(":", "") || 0),
      );
  }, [classEntries, selectedDayName]);

  // Get selected course
  const selectedCourse = useMemo(() => {
    if (!selectedCourseId) return null;
    return classEntries.find((entry) => entry?.kelas?.IdCourse === selectedCourseId);
  }, [classEntries, selectedCourseId]);

  // Fetch student data when course is selected
  useEffect(() => {
    if (!selectedCourse || !selectedCourse.Std || selectedCourse.Std.length === 0) {
      return;
    }

    const nims = selectedCourse.Std.map((student) => student?.nim).filter(Boolean);
    if (nims.length === 0) return;

    const allCached = nims.every((nim) => getStudentFromCache(nim));
    if (allCached) {
      const cached = new Map();
      nims.forEach((nim) => {
        const data = getStudentFromCache(nim);
        if (data) cached.set(nim, data);
      });
      setStudentData(cached);
      return;
    }

    setLoadingStudents(true);
    fetchMultipleStudents(nims)
      .then((results) => {
        setStudentData(results);
        // Update session with student info
        if (session) {
          results.forEach((info, nim) => {
            updateStudentInfo(nim, info);
          });
          setSession({ ...getActiveSession() });
        }
      })
      .catch((error) => {
        console.error("Error fetching student data:", error);
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, [selectedCourse, session]);

  // Fetch lecturer data when course is selected
  useEffect(() => {
    const idCourse = selectedCourse?.kelas?.IdCourse;
    if (!selectedCourse || !idCourse) {
      return;
    }

    setLecturerData(new Map());

    const cached = getLecturersFromCache(idCourse);
    if (cached?.lecturers?.length) {
      const map = new Map();
      cached.lecturers.forEach((lect) => {
        if (lect?.id) {
          map.set(lect.id, { name: lect.name, photo: lect.photo });
        }
      });
      setLecturerData(map);
      return;
    }

    setLoadingLecturers(true);
    fetchLecturersByCourse(idCourse)
      .then((result) => {
        const map = new Map();
        (result?.lecturers || []).forEach((lect) => {
          if (lect?.id) {
            map.set(lect.id, { name: lect.name, photo: lect.photo });
          }
        });
        setLecturerData(map);
      })
      .catch((error) => {
        console.error("Error fetching lecturer data:", error);
      })
      .finally(() => {
        setLoadingLecturers(false);
      });
  }, [selectedCourse]);

  // Handle face recognition callback
  const onFaceDetected = useCallback((faceData) => {
    handleFaceRecognitionResult(faceData);
    setSession({ ...getActiveSession() });
  }, []);

  // Start attendance session
  const handleStartSession = async () => {
    if (!selectedCourse) return;

    const students = (selectedCourse.Std || []).map((s) => {
      const info = studentData.get(s.nim);
      return {
        nim: s.nim,
        name: info?.name || null,
        photo: info?.photo || null,
      };
    });

    // Get lecturer info - use logged in user's ID
    // Try to get lecturer name from lecturerData cache, fallback to user name
    const firstLecturerId = lecturerData.keys().next().value;
    const lecturerInfo = firstLecturerId ? lecturerData.get(firstLecturerId) : null;

    const options = {
      lecturerId: lecturerId || firstLecturerId || 'unknown', // Use logged-in user's ID
      lecturerName: user?.name || lecturerInfo?.name || '',
      selectedDate: selectedDate.toISOString().split('T')[0],
      dayName: selectedDayName,
    };
    
    console.log('📝 Creating session with lecturer_id:', options.lecturerId);

    try {
      const newSession = await createAttendanceSession(selectedCourse.kelas, students, options);
      setSession(newSession);
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Gagal membuat sesi absensi');
    }
  };

  // Complete session
  const handleCompleteSession = async () => {
    try {
      const completed = await completeSession();
      if (completed) {
        downloadSessionAsJSON(completed);
      }
      setSession(null);
      setIsFaceRecognitionActive(false);
      if (ros2Connection) {
        ros2Connection.disconnect();
        setRos2Connection(null);
      }
    } catch (error) {
      console.error('Error completing session:', error);
      setError('Gagal menyelesaikan sesi absensi');
    }
  };

  // Cancel session
  const handleCancelSession = async () => {
    if (window.confirm("Apakah Anda yakin ingin membatalkan sesi absensi ini?")) {
      try {
        await cancelSession();
        setSession(null);
        setIsFaceRecognitionActive(false);
        if (ros2Connection) {
          ros2Connection.disconnect();
          setRos2Connection(null);
        }
      } catch (error) {
        console.error('Error canceling session:', error);
      }
    }
  };

  // Toggle face recognition
  const handleToggleFaceRecognition = () => {
    if (isFaceRecognitionActive) {
      if (ros2Connection) {
        ros2Connection.disconnect();
        setRos2Connection(null);
      }
      setIsFaceRecognitionActive(false);
    } else {
      const connection = initROS2FaceRecognition(onFaceDetected);
      setRos2Connection(connection);
      setIsFaceRecognitionActive(true);
    }
  };

  // Update attendance status
  const handleStatusChange = async (nim, status) => {
    await updateAttendanceStatus(nim, status, "manual");
    setSession({ ...getActiveSession() });
    setExpandedDropdown(null);
  };

  // Download recap
  const handleDownloadRecap = () => {
    downloadSessionAsJSON();
  };

  // Load history - load all sessions by lecturer
  const handleShowHistory = async () => {
    if (!lecturerId) {
      console.warn('⚠️ No lecturer ID available');
      alert('Tidak dapat memuat riwayat: Data dosen tidak ditemukan');
      return;
    }
    
    console.log('🔍 Loading history for lecturer:', lecturerId);
    setHistoryLoading(true);
    setShowHistory(true);
    try {
      // Load ALL sessions by this lecturer (not filtered by course)
      const filters = { lecturerId: String(lecturerId) };
      
      // Apply additional filters if set
      if (historyFilter.courseId) {
        filters.courseId = historyFilter.courseId;
      }
      if (historyFilter.startDate) {
        filters.startDate = historyFilter.startDate;
      }
      if (historyFilter.endDate) {
        filters.endDate = historyFilter.endDate;
      }
      
      const history = await getAttendanceHistory(filters);
      console.log('📋 History loaded:', history.length, 'sessions');
      setHistoryData(history);
    } catch (error) {
      console.error('❌ Error loading history:', error);
      setHistoryData([]);
      // Don't close modal on error, just show empty state
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Filter history
  const handleFilterHistory = async () => {
    if (!lecturerId) {
      console.warn('⚠️ No lecturer ID available');
      return;
    }
    
    setHistoryLoading(true);
    try {
      const filters = { lecturerId: String(lecturerId) };
      if (historyFilter.courseId) filters.courseId = historyFilter.courseId;
      if (historyFilter.startDate) filters.startDate = historyFilter.startDate;
      if (historyFilter.endDate) filters.endDate = historyFilter.endDate;
      
      const history = await getAttendanceHistory(filters);
      setHistoryData(history);
    } catch (error) {
      console.error('❌ Error filtering history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Open edit session modal
  const handleEditSession = async (sessionItem) => {
    console.log('📝 Editing session:', sessionItem.id);
    console.log('📝 Session item attendance:', sessionItem.attendance);
    // Load full session detail with records
    try {
      const fullSession = await getSessionDetail(sessionItem.id);
      console.log('📝 Full session loaded:', fullSession);
      console.log('📝 Full session attendance:', fullSession.attendance);
      console.log('📝 First student record:', fullSession.attendance?.[0]);
      setEditingSession(fullSession);
      setEditAttendance(fullSession.attendance || []);
    } catch (error) {
      console.error('❌ Error loading session detail:', error);
      // Fallback to item data
      setEditingSession(sessionItem);
      setEditAttendance(sessionItem.attendance || []);
    }
  };
  
  // Update attendance in edit mode
  const handleEditStatusChange = (nim, newStatus) => {
    setEditAttendance(prev => 
      prev.map(student => 
        student.nim === nim ? { ...student, status: newStatus } : student
      )
    );
  };
  
  // Save edited session
  const handleSaveEditedSession = async () => {
    if (!editingSession) return;
    try {
      console.log('💾 Saving edited session:', editingSession.id);
      console.log('📊 Updated attendance:', editAttendance);
      
      await updateSessionRecords(editingSession.id, editAttendance);
      console.log('✅ Session saved successfully');
      
      // Close edit modal first
      setEditingSession(null);
      setEditAttendance([]);
      
      // Reload history to show updated data
      if (historyFilter.courseId || historyFilter.startDate || historyFilter.endDate) {
        await handleFilterHistory();
      } else {
        await handleShowHistory();
      }
      
    } catch (error) {
      console.error('❌ Error saving session:', error);
      alert('Gagal menyimpan perubahan: ' + error.message);
    }
  };

  // Date navigation
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    setSelectedCourseId(null);
    setSession(null);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    setSelectedCourseId(null);
    setSession(null);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date());
    setSelectedCourseId(null);
    setSession(null);
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Get attendance stats
  const stats = session ? getAttendanceStats() : null;

  // Get attendance list from session or course
  const attendanceList = useMemo(() => {
    if (session) {
      return session.attendance;
    }
    return [];
  }, [session]);

  return (
    <div className="absensi-management">
      {/* Header Section */}
      <div className="absensi-header">
        <div className="absensi-header__left">
          <h2>
            <UserCheck size={24} />
            Manajemen Absensi
          </h2>
          <p className="absensi-subtitle">
            {session
              ? `Sesi aktif: ${session.courseName}`
              : "Pilih mata kuliah untuk memulai absensi"}
          </p>
        </div>
        <div className="absensi-header__right">
          <button
            className="btn-secondary"
            onClick={handleShowHistory}
          >
            <History size={16} />
            Riwayat
          </button>
          {session && (
            <>
              <button
                className="btn-secondary"
                onClick={handleDownloadRecap}
              >
                <Download size={16} />
                Unduh Rekap
              </button>
            </>
          )}
        </div>
      </div>

      <div className="absensi-content">
        {/* Left Column - Course Selection & Info */}
        <div className="absensi-left-column">
          {/* Course List */}
          <div className="absensi-card">
            <div className="course-list-header">
              <h3>
                <Calendar size={18} />
                Jadwal
              </h3>
              <div className="date-selector">
                <button className="date-nav-btn" onClick={handlePrevDay} title="Hari Sebelumnya">
                  <ChevronLeft size={16} />
                </button>
                <button 
                  className={`date-display ${!isToday ? 'not-today' : ''}`}
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  title="Pilih Tanggal"
                >
                  {selectedDate.getDate()} {selectedDate.toLocaleString('id-ID', { month: 'short' })}
                </button>
                <button className="date-nav-btn" onClick={handleNextDay} title="Hari Berikutnya">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            {!isToday && (
              <div className="date-info-banner">
                <span className="date-full">{formatDate(selectedDate)}</span>
                <button className="btn-today" onClick={handleSetToday}>
                  Kembali ke Hari Ini
                </button>
              </div>
            )}
            {showDatePicker && (
              <div className="mini-date-picker">
                <div className="quick-dates">
                  <button onClick={() => { handleSetToday(); setShowDatePicker(false); }}>Hari Ini</button>
                  <button onClick={() => { 
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday);
                    setSelectedCourseId(null);
                    setSession(null);
                    setShowDatePicker(false);
                  }}>Kemarin</button>
                  <button onClick={() => { 
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                    setSelectedCourseId(null);
                    setSession(null);
                    setShowDatePicker(false);
                  }}>Besok</button>
                </div>
                <input 
                  type="date" 
                  className="date-input"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(new Date(e.target.value + 'T00:00:00'));
                    setSelectedCourseId(null);
                    setSession(null);
                    setShowDatePicker(false);
                  }}
                />
              </div>
            )}
            <div className="course-list">
              {loading && <div className="course-placeholder">Memuat data kelas...</div>}
              {!loading && error && <div className="course-placeholder error">{error}</div>}
              {!loading && !error && dayEntries.length === 0 && (
                <div className="course-placeholder">Tidak ada kelas hari ini.</div>
              )}
              {!loading &&
                dayEntries.map((entry) => {
                  const isSelected = selectedCourseId === entry?.kelas?.IdCourse;
                  const hasActiveSession = session?.courseId === entry?.kelas?.IdCourse;
                  return (
                    <button
                      key={entry?.kelas?.IdCourse}
                      className={`course-item ${isSelected ? "selected" : ""} ${
                        hasActiveSession ? "active-session" : ""
                      }`}
                      onClick={() => setSelectedCourseId(entry?.kelas?.IdCourse)}
                    >
                      <div className="course-item__time">
                        {formatTime(entry?.kelas?.mulai)} - {formatTime(entry?.kelas?.selesai)}
                      </div>
                      <div className="course-item__name">{entry?.kelas?.Matakuliah}</div>
                      <div className="course-item__code">
                        {entry?.kelas?.KodeMk} • {entry?.kelas?.KodeRuang}
                      </div>
                      {hasActiveSession && (
                        <span className="session-badge">Sesi Aktif</span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Course Detail */}
          {selectedCourse && (
            <div className="absensi-card">
              <h3>Detail Mata Kuliah</h3>
              <div className="detail-info">
                <div className="detail-row">
                  <span>Nama</span>
                  <strong>{selectedCourse?.kelas?.Matakuliah}</strong>
                </div>
                <div className="detail-row">
                  <span>Kode MK</span>
                  <strong>{selectedCourse?.kelas?.KodeMk}</strong>
                </div>
                <div className="detail-row">
                  <span>Ruang</span>
                  <strong>{selectedCourse?.kelas?.KodeRuang}</strong>
                </div>
                <div className="detail-row">
                  <span>Waktu</span>
                  <strong>
                    {formatTime(selectedCourse?.kelas?.mulai)} -{" "}
                    {formatTime(selectedCourse?.kelas?.selesai)}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Jumlah Mahasiswa</span>
                  <strong>{selectedCourse?.Std?.length || 0}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Lecturer Info */}
          {selectedCourse && (
            <div className="absensi-card">
              <h3>Informasi Dosen</h3>
              <div className="lecturer-list">
                {Object.values(selectedCourse?.dosen || {})
                  .filter((item) => typeof item === "object")
                  .map((dosen) => {
                    const staffId = dosen?.IdStaff || dosen?.StaffId;
                    const lecturerInfo = staffId ? lecturerData.get(staffId) : null;
                    const displayName = lecturerInfo?.name || dosen?.StaffName || "Dosen";
                    const photoSrc = resolvePhotoSrc(lecturerInfo?.photo);

                    return (
                      <div key={staffId || displayName} className="lecturer-item">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={displayName}
                            className="avatar"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = getPhotoPlaceholder(displayName);
                            }}
                          />
                        ) : (
                          <div className="avatar avatar--text">
                            {buildInitials(displayName)}
                          </div>
                        )}
                        <div className="lecturer-info">
                          <strong>{displayName}</strong>
                          <span className="muted">
                            {loadingLecturers && !lecturerInfo ? "Memuat..." : staffId}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Attendance Management */}
        <div className="absensi-right-column">
          {/* Session Controls */}
          {selectedCourse && (
            <div className="absensi-card session-controls">
              {!session ? (
                <button
                  className="btn-primary btn-large"
                  onClick={handleStartSession}
                >
                  <Play size={20} />
                  Mulai Sesi Absensi
                </button>
              ) : (
                <div className="session-actions">
                  <button
                    className={`btn-face-recognition ${isFaceRecognitionActive ? "active" : ""}`}
                    onClick={handleToggleFaceRecognition}
                  >
                    <Camera size={20} />
                    {isFaceRecognitionActive ? "Face Recognition Aktif" : "Absen Wajah"}
                  </button>
                  <button
                    className="btn-success"
                    onClick={handleCompleteSession}
                  >
                    <Check size={20} />
                    Selesai & Simpan
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleCancelSession}
                  >
                    <X size={20} />
                    Batalkan
                  </button>
                </div>
              )}

              {isFaceRecognitionActive && (
                <div className="face-recognition-status">
                  <div className="pulse-indicator"></div>
                  <span>Menunggu deteksi wajah dari ROS2...</span>
                </div>
              )}
            </div>
          )}

          {/* Attendance Stats */}
          {session && stats && (
            <div className="absensi-card stats-card">
              <h3>
                <Users size={18} />
                Statistik Absensi
              </h3>
              <div className="stats-grid">
                <div className="stat-item stat-hadir">
                  <span className="stat-value">{stats.hadir}</span>
                  <span className="stat-label">Hadir</span>
                </div>
                <div className="stat-item stat-sakit">
                  <span className="stat-value">{stats.sakit}</span>
                  <span className="stat-label">Sakit</span>
                </div>
                <div className="stat-item stat-izin">
                  <span className="stat-value">{stats.izin}</span>
                  <span className="stat-label">Izin</span>
                </div>
                <div className="stat-item stat-dispensasi">
                  <span className="stat-value">{stats.dispensasi}</span>
                  <span className="stat-label">Dispensasi</span>
                </div>
                <div className="stat-item stat-alpha">
                  <span className="stat-value">{stats.alpha}</span>
                  <span className="stat-label">Alpha</span>
                </div>
                <div className="stat-item stat-pending">
                  <span className="stat-value">{stats.notMarked}</span>
                  <span className="stat-label">Belum</span>
                </div>
              </div>
              <div className="stats-summary">
                <span>
                  <Camera size={14} /> Face Recognition: {stats.faceRecognized}
                </span>
                <span>
                  <UserCheck size={14} /> Manual: {stats.manualMarked}
                </span>
              </div>
            </div>
          )}

          {/* Student List */}
          {session ? (
            <div className="absensi-card student-list-card">
              <h3>Daftar Mahasiswa ({attendanceList.length})</h3>
              <div className="student-list">
                {attendanceList.map((student) => {
                  const studentInfo = studentData.get(student.nim);
                  const displayName = student.name || studentInfo?.name || student.nim;
                  const photoSrc = resolvePhotoSrc(student.photo || studentInfo?.photo);
                  const isDropdownOpen = expandedDropdown === student.nim;
                  const statusColor = ATTENDANCE_STATUS_COLOR[student.status];

                  return (
                    <div key={student.nim} className="student-row">
                      <div className="student-info">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={displayName}
                            className="avatar"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = getPhotoPlaceholder(displayName);
                            }}
                          />
                        ) : (
                          <div className="avatar avatar--text">
                            {buildInitials(displayName)}
                          </div>
                        )}
                        <div className="student-details">
                          <strong>{displayName}</strong>
                          <span className="muted">
                            {loadingStudents && !studentInfo ? "Memuat..." : student.nim}
                          </span>
                          {student.markedBy === "face_recognition" && (
                            <span className="face-badge">
                              <Camera size={10} /> {Math.round((student.confidence || 0) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="student-status">
                        <div className="status-dropdown">
                          <button
                            className="status-button"
                            style={{
                              backgroundColor: `${statusColor}20`,
                              borderColor: statusColor,
                              color: statusColor,
                            }}
                            onClick={() =>
                              setExpandedDropdown(isDropdownOpen ? null : student.nim)
                            }
                          >
                            {ATTENDANCE_STATUS_LABEL[student.status]}
                            <ChevronDown size={14} />
                          </button>

                          {isDropdownOpen && (
                            <div className="status-dropdown-menu">
                              {Object.entries(ATTENDANCE_STATUS).map(([key, value]) => {
                                if (value === ATTENDANCE_STATUS.NOT_MARKED) return null;
                                return (
                                  <button
                                    key={key}
                                    className={`status-option ${
                                      student.status === value ? "selected" : ""
                                    }`}
                                    style={{
                                      borderLeftColor: ATTENDANCE_STATUS_COLOR[value],
                                    }}
                                    onClick={() => handleStatusChange(student.nim, value)}
                                  >
                                    {ATTENDANCE_STATUS_LABEL[value]}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : selectedCourse ? (
            <div className="absensi-card student-list-card">
              <h3>Daftar Mahasiswa ({selectedCourse?.Std?.length || 0})</h3>
              <p className="student-list-hint">
                Mulai sesi absensi untuk melihat dan mengelola kehadiran mahasiswa.
              </p>
              <div className="student-list preview-mode">
                {(selectedCourse?.Std || []).map((student) => {
                  const studentInfo = studentData.get(student.nim);
                  const displayName = studentInfo?.name || student.nim;
                  const photoSrc = resolvePhotoSrc(studentInfo?.photo);

                  return (
                    <div key={student.nim} className="student-row preview">
                      <div className="student-info">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={displayName}
                            className="avatar"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = getPhotoPlaceholder(displayName);
                            }}
                          />
                        ) : (
                          <div className="avatar avatar--text">
                            {buildInitials(displayName)}
                          </div>
                        )}
                        <div className="student-details">
                          <strong>{displayName}</strong>
                          <span className="muted">
                            {loadingStudents && !studentInfo ? "Memuat..." : student.nim}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="absensi-card empty-state">
              <Users size={48} />
              <h3>Pilih Mata Kuliah</h3>
              <p>Pilih mata kuliah dari daftar untuk memulai sesi absensi.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && !editingSession && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content history-modal history-modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <History size={20} />
                Riwayat Absensi
              </h2>
              <button className="modal-close" onClick={() => { setShowHistory(false); setHistoryFilter({ courseId: '', startDate: '', endDate: '' }); }}>
                <X size={20} />
              </button>
            </div>
            
            {/* Filter Section */}
            <div className="history-filters">
              <div className="filter-group">
                <label>Mata Kuliah:</label>
                <select 
                  value={historyFilter.courseId}
                  onChange={(e) => setHistoryFilter(prev => ({ ...prev, courseId: e.target.value }))}
                >
                  <option value="">Semua Mata Kuliah</option>
                  {/* Get unique courses from history data */}
                  {historyData && Array.isArray(historyData) && (() => {
                    try {
                      // Get unique courses from loaded history
                      const uniqueCourses = [...new Map(
                        historyData
                          .filter(h => h && h.courseId && h.courseName)
                          .map(h => [h.courseId, { id: h.courseId, name: h.courseName, code: h.courseCode }])
                      ).values()];
                      
                      return uniqueCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name} ({course.code})
                        </option>
                      ));
                    } catch (err) {
                      console.error('Error building course filter:', err);
                      return null;
                    }
                  })()}
                </select>
              </div>
              <div className="filter-group">
                <label>Dari Tanggal:</label>
                <input 
                  type="date" 
                  value={historyFilter.startDate}
                  onChange={(e) => setHistoryFilter(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Sampai Tanggal:</label>
                <input 
                  type="date" 
                  value={historyFilter.endDate}
                  onChange={(e) => setHistoryFilter(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <button className="btn-primary btn-small" onClick={handleFilterHistory}>
                Terapkan Filter
              </button>
              <button className="btn-secondary btn-small" onClick={() => { setHistoryFilter({ courseId: '', startDate: '', endDate: '' }); handleShowHistory(); }}>
                Reset
              </button>
            </div>
            
            <div className="modal-body">
              {historyLoading ? (
                <div className="loading-state">
                  <p>Memuat riwayat...</p>
                </div>
              ) : !Array.isArray(historyData) || historyData.length === 0 ? (
                <div className="empty-history">
                  <p>Belum ada riwayat absensi.</p>
                </div>
              ) : (
                <div className="history-list">
                  {historyData.map((item) => {
                    if (!item || !item.id) return null;
                    return (
                    <div key={item.id} className="history-item">
                      <div className="history-item__header">
                        <strong>{item.courseName}</strong>
                        <span className="history-date">{item.date}</span>
                      </div>
                      <div className="history-item__details">
                        <span>{item.courseCode}</span>
                        <span>•</span>
                        <span>{item.className || item.room}</span>
                      </div>
                      <div className="history-item__stats">
                        <span className="stat-hadir">
                          Hadir: {item.stats?.hadir || 0}
                        </span>
                        <span className="stat-sakit">
                          Sakit: {item.stats?.sakit || 0}
                        </span>
                        <span className="stat-izin">
                          Izin: {item.stats?.izin || 0}
                        </span>
                        <span className="stat-dispensasi">
                          Dispensasi: {item.stats?.dispensasi || 0}
                        </span>
                        <span className="stat-alpha">
                          Alpha: {item.stats?.alpha || 0}
                        </span>
                      </div>
                      <div className="history-item__actions">
                        <button
                          className="btn-primary btn-small"
                          onClick={() => handleEditSession(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(item, null, 2)], {
                              type: "application/json",
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `absensi_${item.courseCode}_${item.date}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download size={14} />
                          Unduh
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Session Modal */}
      {editingSession && (
        <div className="modal-overlay" onClick={() => setEditingSession(null)}>
          <div className="modal-content edit-session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Edit Absensi - {editingSession.courseName}
              </h2>
              <button className="modal-close" onClick={() => { setEditingSession(null); setEditAttendance([]); }}>
                <X size={20} />
              </button>
            </div>
            <div className="edit-session-info">
              <span>{editingSession.courseCode}</span>
              <span>•</span>
              <span>{editingSession.date}</span>
              <span>•</span>
              <span>{editingSession.className}</span>
            </div>
            <div className="modal-body edit-attendance-list">
              {editAttendance.map((student) => (
                <div key={student.nim} className="edit-attendance-item">
                  <div className="student-info">
                    <strong>{student.name}</strong>
                    <span className="nim">{student.nim}</span>
                  </div>
                  <div className="status-buttons">
                    {Object.keys(ATTENDANCE_STATUS).map((key) => {
                      const statusValue = ATTENDANCE_STATUS[key];
                      if (statusValue === 'not_marked') return null;
                      return (
                        <button
                          key={statusValue}
                          className={`status-btn ${student.status === statusValue ? 'active' : ''}`}
                          style={{
                            backgroundColor: student.status === statusValue ? ATTENDANCE_STATUS_COLOR[statusValue] : '#e0e0e0',
                            color: student.status === statusValue ? '#fff' : '#333'
                          }}
                          onClick={() => handleEditStatusChange(student.nim, statusValue)}
                        >
                          {ATTENDANCE_STATUS_LABEL[statusValue]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setEditingSession(null); setEditAttendance([]); }}>
                Batal
              </button>
              <button className="btn-primary" onClick={handleSaveEditedSession}>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
