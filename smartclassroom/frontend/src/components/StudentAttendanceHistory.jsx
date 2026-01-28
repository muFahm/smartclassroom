import React, { useState, useEffect, useMemo } from "react";
import {
  getStudentEnrollments,
  getStudentCourseAttendance,
  getStudentAllCoursesAttendance,
} from "../services/attendanceService";
import "./StudentAttendanceHistory.css";

// Constants for calendar and timeline
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HOURS = Array.from({ length: 14 }, (_, index) => 6 + index); // 06:00 - 19:00

const formatTime = (time) => time?.slice(0, 5) || "-";

const parseMinutes = (time) => {
  if (!time) return 0;
  const [hh, mm] = time.split(":").map((part) => Number(part));
  return hh * 60 + mm;
};

const startOfDayMinutes = 6 * 60;
const PX_PER_MINUTE = 2;
const endOfDayMinutes = (HOURS[HOURS.length - 1] + 1) * 60;

const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let i = 0; i < startWeekday; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
};

// Status badge component
const StatusBadge = ({ status, size = "normal" }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case "hadir":
        return { label: "H", color: "#22c55e", fullLabel: "Hadir" };
      case "sakit":
        return { label: "S", color: "#f59e0b", fullLabel: "Sakit" };
      case "izin":
        return { label: "I", color: "#3b82f6", fullLabel: "Izin" };
      case "dispensasi":
        return { label: "D", color: "#8b5cf6", fullLabel: "Dispensasi" };
      case "alpha":
        return { label: "A", color: "#ef4444", fullLabel: "Alpha" };
      default:
        return { label: "-", color: "#94a3b8", fullLabel: "Belum" };
    }
  };

  const info = getStatusInfo(status);

  return (
    <span
      className={`status-badge ${size}`}
      style={{ backgroundColor: info.color }}
      title={info.fullLabel}
    >
      {info.label}
    </span>
  );
};

export default function StudentAttendanceHistory({ nim }) {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseAttendance, setCourseAttendance] = useState(null);
  const [allCoursesData, setAllCoursesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("schedule"); // "schedule", "summary", or "detail"
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch enrollments and summary on mount
  useEffect(() => {
    if (!nim) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [enrollmentsResponse, summaryResponse] = await Promise.all([
          getStudentEnrollments(nim),
          getStudentAllCoursesAttendance(nim),
        ]);
        setEnrollments(enrollmentsResponse?.enrollments || []);
        setAllCoursesData(summaryResponse?.courses || []);
      } catch (err) {
        console.error("Error fetching enrollment data:", err);
        setError("Gagal memuat data mata kuliah. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [nim]);

  // Fetch course attendance when a course is selected
  const handleCourseSelect = async (course) => {
    if (selectedCourse?.id === course.id) {
      setSelectedCourse(null);
      setCourseAttendance(null);
      return;
    }

    setSelectedCourse(course);
    setLoadingCourse(true);
    setViewMode("detail");

    try {
      const data = await getStudentCourseAttendance(nim, course.id);
      setCourseAttendance(data);
    } catch (err) {
      console.error("Error fetching course attendance:", err);
      setError("Gagal memuat riwayat absensi mata kuliah.");
      setCourseAttendance(null);
    } finally {
      setLoadingCourse(false);
    }
  };

  // Calendar functions
  const calendarDays = useMemo(() => {
    return getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
  };

  // Timeline data - filter courses by selected day
  const selectedDayName = WEEKDAY_NAMES[selectedDate.getDay()];
  const timelineWidth = (endOfDayMinutes - startOfDayMinutes) * PX_PER_MINUTE;

  const daySchedule = useMemo(() => {
    return allCoursesData
      .filter((course) => {
        const courseDay = course.day;
        return courseDay === selectedDayName;
      })
      .sort((a, b) => parseMinutes(a.start_time) - parseMinutes(b.start_time));
  }, [allCoursesData, selectedDayName]);

  // Generate meeting numbers array (1-17)
  const meetingNumbers = useMemo(() => {
    return Array.from({ length: 17 }, (_, i) => i + 1);
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className="attendance-history-container">
        <div className="loading-state">
          <iconify-icon icon="mdi:loading" className="loading-spinner" width="48" height="48"></iconify-icon>
          <p>Memuat data jadwal kelas...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && allCoursesData.length === 0) {
    return (
      <div className="attendance-history-container">
        <div className="error-state">
          <iconify-icon icon="mdi:alert-circle" width="48" height="48"></iconify-icon>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (allCoursesData.length === 0) {
    return (
      <div className="attendance-history-container">
        <div className="empty-state">
          <iconify-icon icon="mdi:school-outline" width="64" height="64"></iconify-icon>
          <h2>Belum Ada Data Mata Kuliah</h2>
          <p>Data enrollment belum tersedia untuk semester ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-history-container">
      {/* Header */}
      <div className="attendance-header">
        <h2>
          <iconify-icon icon="mdi:calendar-clock" width="28" height="28"></iconify-icon>
          Jadwal Kelas
        </h2>
        <div className="view-toggle">
          <button
            className={viewMode === "schedule" ? "active" : ""}
            onClick={() => {
              setViewMode("schedule");
              setSelectedCourse(null);
              setCourseAttendance(null);
            }}
          >
            <iconify-icon icon="mdi:calendar-clock" width="18" height="18"></iconify-icon>
            Jadwal
          </button>
          <button
            className={viewMode === "summary" ? "active" : ""}
            onClick={() => {
              setViewMode("summary");
              setSelectedCourse(null);
              setCourseAttendance(null);
            }}
          >
            <iconify-icon icon="mdi:view-grid" width="18" height="18"></iconify-icon>
            Absensi
          </button>
          <button
            className={viewMode === "detail" ? "active" : ""}
            onClick={() => setViewMode("detail")}
          >
            <iconify-icon icon="mdi:table" width="18" height="18"></iconify-icon>
            Detail
          </button>
        </div>
      </div>

      {/* Schedule View - Calendar + Timeline */}
      {viewMode === "schedule" && (
        <div className="schedule-view">
          <div className="schedule-row">
            {/* Calendar Card */}
            <div className="calendar-card">
              <div className="calendar-header">
                <button className="calendar-nav" onClick={handlePrevMonth}>
                  <iconify-icon icon="mdi:chevron-left" width="24" height="24"></iconify-icon>
                </button>
                <div className="calendar-title">
                  {currentMonth.toLocaleString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button className="calendar-nav" onClick={handleNextMonth}>
                  <iconify-icon icon="mdi:chevron-right" width="24" height="24"></iconify-icon>
                </button>
              </div>
              <div className="calendar-grid">
                {WEEKDAY_NAMES.map((day, idx) => (
                  <div key={day} className="calendar-weekday">
                    {WEEKDAY_NAMES_ID[idx].slice(0, 3)}
                  </div>
                ))}
                {calendarDays.map((date, index) => {
                  const isSelected =
                    date &&
                    date.toDateString() === selectedDate.toDateString() &&
                    date.getMonth() === currentMonth.getMonth();
                  const isToday = date && date.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={`${date ? date.toISOString() : "empty"}-${index}`}
                      className={`calendar-day ${isSelected ? "selected" : ""} ${
                        isToday ? "today" : ""
                      } ${!date ? "empty" : ""}`}
                      onClick={() => handleDateClick(date)}
                      disabled={!date}
                    >
                      {date ? date.getDate() : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timeline Card */}
            <div className="timeline-card">
              <div className="timeline-header">
                <div>
                  <h3>
                    <iconify-icon icon="mdi:clock-outline" width="20" height="20"></iconify-icon>
                    Jadwal {WEEKDAY_NAMES_ID[selectedDate.getDay()]}
                  </h3>
                  <p>
                    {selectedDate.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="course-count">
                  {daySchedule.length} Mata Kuliah
                </span>
              </div>

              <div className="timeline-horizontal">
                <div className="timeline-scroll">
                  <div
                    className="timeline-hours"
                    style={{ width: `${timelineWidth}px` }}
                  >
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="timeline-hour"
                        style={{ width: `${60 * PX_PER_MINUTE}px` }}
                      >
                        {`${hour.toString().padStart(2, "0")}:00`}
                      </div>
                    ))}
                  </div>
                  <div className="timeline-track" style={{ width: `${timelineWidth}px` }}>
                    <div
                      className="timeline-track__grid"
                      style={{ width: `${timelineWidth}px` }}
                    >
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="timeline-line"
                          style={{ width: `${60 * PX_PER_MINUTE}px` }}
                        />
                      ))}
                    </div>

                    {daySchedule.map((course) => {
                      const start = parseMinutes(course.start_time);
                      const end = parseMinutes(course.end_time);
                      const left = Math.max(start - startOfDayMinutes, 0) * PX_PER_MINUTE;
                      const width = Math.max((end - start) * PX_PER_MINUTE, 120);
                      return (
                        <button
                          key={course.course_id}
                          className={`timeline-event ${
                            selectedCourse?.id === course.course_id ? "active" : ""
                          }`}
                          style={{ left, width }}
                          onClick={() => handleCourseSelect({ 
                            id: course.course_id, 
                            code: course.course_code, 
                            name: course.course_name 
                          })}
                        >
                          <div className="timeline-event__time">
                            {formatTime(course.start_time)} - {formatTime(course.end_time)}
                          </div>
                          <div className="timeline-event__title">
                            {course.course_name}
                          </div>
                          <div className="timeline-event__subtitle">
                            {course.course_code} • Kelas {course.class_code}
                          </div>
                        </button>
                      );
                    })}

                    {daySchedule.length === 0 && (
                      <div className="timeline-empty">
                        <iconify-icon icon="mdi:calendar-blank" width="32" height="32"></iconify-icon>
                        <span>Tidak ada kelas di hari ini</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* All Week Schedule */}
          <div className="week-schedule-card">
            <h3>
              <iconify-icon icon="mdi:calendar-week" width="20" height="20"></iconify-icon>
              Jadwal Mingguan
            </h3>
            <div className="week-schedule-grid">
              {WEEKDAY_NAMES_ID.slice(1, 6).map((dayName, idx) => {
                const dayEnglish = WEEKDAY_NAMES[idx + 1];
                const dayCourses = allCoursesData.filter(
                  (course) => course.day === dayEnglish
                ).sort((a, b) => parseMinutes(a.start_time) - parseMinutes(b.start_time));

                return (
                  <div key={dayName} className="week-day-column">
                    <div className="week-day-header">{dayName}</div>
                    <div className="week-day-courses">
                      {dayCourses.length === 0 ? (
                        <div className="no-course">-</div>
                      ) : (
                        dayCourses.map((course) => (
                          <div
                            key={course.course_id}
                            className="week-course-item"
                            onClick={() => handleCourseSelect({ 
                              id: course.course_id, 
                              code: course.course_code, 
                              name: course.course_name 
                            })}
                          >
                            <span className="course-time">
                              {formatTime(course.start_time)}
                            </span>
                            <span className="course-name">{course.course_name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary View - Attendance Cards */}
      {viewMode === "summary" && (
        <div className="summary-view">
          {/* Legend */}
          <div className="legend-row">
            <span className="legend-item">
              <StatusBadge status="hadir" size="small" /> Hadir
            </span>
            <span className="legend-item">
              <StatusBadge status="sakit" size="small" /> Sakit
            </span>
            <span className="legend-item">
              <StatusBadge status="izin" size="small" /> Izin
            </span>
            <span className="legend-item">
              <StatusBadge status="dispensasi" size="small" /> Dispensasi
            </span>
            <span className="legend-item">
              <StatusBadge status="alpha" size="small" /> Alpha
            </span>
          </div>

          {/* Course Cards */}
          <div className="course-cards-grid">
            {allCoursesData.map((courseData) => {
              const stats = courseData.summary || {};
              const percentage = stats.attendance_percentage || 0;

              return (
                <div
                  key={courseData.course_id}
                  className={`course-summary-card ${selectedCourse?.id === courseData.course_id ? "selected" : ""}`}
                  onClick={() => handleCourseSelect({ 
                    id: courseData.course_id, 
                    code: courseData.course_code, 
                    name: courseData.course_name 
                  })}
                >
                  <div className="course-info">
                    <h3 className="course-name">{courseData.course_name || "Mata Kuliah"}</h3>
                    <span className="course-code">{courseData.course_code || "-"}</span>
                    <span className="course-schedule">
                      {courseData.day ? WEEKDAY_NAMES_ID[WEEKDAY_NAMES.indexOf(courseData.day)] : ""} {formatTime(courseData.start_time)} - {formatTime(courseData.end_time)}
                    </span>
                  </div>

                  <div className="attendance-summary">
                    <div className="percentage-circle" data-percentage={percentage}>
                      <svg viewBox="0 0 36 36">
                        <path
                          className="circle-bg"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="circle-progress"
                          strokeDasharray={`${percentage}, 100`}
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="percentage-text">{percentage}%</span>
                    </div>

                    <div className="stats-mini">
                      <div className="stat-item hadir">
                        <span className="stat-value">{stats.hadir || 0}</span>
                        <span className="stat-label">Hadir</span>
                      </div>
                      <div className="stat-item alpha">
                        <span className="stat-value">{stats.alpha || 0}</span>
                        <span className="stat-label">Alpha</span>
                      </div>
                      <div className="stat-item other">
                        <span className="stat-value">
                          {(stats.sakit || 0) + (stats.izin || 0) + (stats.dispensasi || 0)}
                        </span>
                        <span className="stat-label">Lainnya</span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <span className="total-pertemuan">
                      {stats.total || 0} / 17 Pertemuan
                    </span>
                    <iconify-icon icon="mdi:chevron-right" width="20" height="20"></iconify-icon>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail View */}
      {viewMode === "detail" && (
        <div className="detail-view">
          {/* Course Selection List */}
          <div className="course-list-sidebar">
            <h4>Pilih Mata Kuliah</h4>
            <ul className="course-list">
              {allCoursesData.map((courseData) => {
                return (
                  <li
                    key={courseData.course_id}
                    className={`course-list-item ${selectedCourse?.id === courseData.course_id ? "selected" : ""}`}
                    onClick={() => handleCourseSelect({ 
                      id: courseData.course_id, 
                      code: courseData.course_code, 
                      name: courseData.course_name 
                    })}
                  >
                    <span className="course-name">{courseData.course_name || "Mata Kuliah"}</span>
                    <span className="course-code">{courseData.course_code || "-"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Attendance Grid */}
          <div className="attendance-grid-panel">
            {!selectedCourse ? (
              <div className="select-course-prompt">
                <iconify-icon icon="mdi:hand-pointing-left" width="48" height="48"></iconify-icon>
                <p>Pilih mata kuliah untuk melihat detail absensi</p>
              </div>
            ) : loadingCourse ? (
              <div className="loading-course">
                <iconify-icon icon="mdi:loading" className="loading-spinner" width="32" height="32"></iconify-icon>
                <p>Memuat data absensi...</p>
              </div>
            ) : courseAttendance ? (
              <>
                <div className="course-detail-header">
                  <h3>{courseAttendance.course_name || selectedCourse.name}</h3>
                  <span className="course-code">{courseAttendance.course_code || selectedCourse.code}</span>
                </div>

                {/* Attendance Stats */}
                <div className="attendance-stats-bar">
                  <div className="stat-box hadir">
                    <iconify-icon icon="mdi:check-circle" width="20" height="20"></iconify-icon>
                    <span>{courseAttendance.summary?.hadir || 0} Hadir</span>
                  </div>
                  <div className="stat-box sakit">
                    <iconify-icon icon="mdi:hospital" width="20" height="20"></iconify-icon>
                    <span>{courseAttendance.summary?.sakit || 0} Sakit</span>
                  </div>
                  <div className="stat-box izin">
                    <iconify-icon icon="mdi:file-document" width="20" height="20"></iconify-icon>
                    <span>{courseAttendance.summary?.izin || 0} Izin</span>
                  </div>
                  <div className="stat-box dispensasi">
                    <iconify-icon icon="mdi:shield-check" width="20" height="20"></iconify-icon>
                    <span>{courseAttendance.summary?.dispensasi || 0} Dispensasi</span>
                  </div>
                  <div className="stat-box alpha">
                    <iconify-icon icon="mdi:close-circle" width="20" height="20"></iconify-icon>
                    <span>{courseAttendance.summary?.alpha || 0} Alpha</span>
                  </div>
                </div>

                {/* 17 Meeting Grid */}
                <div className="meeting-grid-container">
                  <table className="meeting-grid">
                    <thead>
                      <tr>
                        {meetingNumbers.map((num) => (
                          <th key={num}>P{num}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {meetingNumbers.map((num) => {
                          const meeting = courseAttendance.meetings?.find(
                            (m) => m.meeting_number === num
                          );
                          return (
                            <td key={num}>
                              {meeting ? (
                                <StatusBadge status={meeting.status} />
                              ) : (
                                <StatusBadge status={null} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Meeting Details List */}
                <div className="meeting-details-list">
                  <h4>Detail Pertemuan</h4>
                  {courseAttendance.meetings && courseAttendance.meetings.length > 0 ? (
                    <ul>
                      {courseAttendance.meetings.map((meeting) => (
                        <li key={meeting.meeting_number} className="meeting-detail-item">
                          <span className="meeting-number">Pertemuan {meeting.meeting_number}</span>
                          <span className="meeting-date">
                            {meeting.date
                              ? new Date(meeting.date).toLocaleDateString("id-ID", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "-"}
                          </span>
                          <StatusBadge status={meeting.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-meetings">Belum ada pertemuan yang tercatat.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="no-attendance-data">
                <iconify-icon icon="mdi:calendar-blank" width="48" height="48"></iconify-icon>
                <p>Tidak ada data absensi untuk mata kuliah ini.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
