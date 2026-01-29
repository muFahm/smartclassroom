import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ClassOverviewDetail.css";
import { fetchMultipleStudents, getStudentFromCache, hasStudentPhoto } from "../../services/studentDataService";
import { fetchLecturersByCourse, getLecturersFromCache } from "../../services/lecturerDataService";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

const SIS_TOKEN = process.env.REACT_APP_SIS_TOKEN || "XX";
const SIS_SEMESTER = process.env.REACT_APP_SIS_SEMESTER || "20251";
const SIS_PROGRAMS = ["0641", "0650"];
const SIS_BASE_URL = "https://sis.trisakti.ac.id/api/get-data-kelas";

export default function ClassOverviewDetail({ showEnterDashboard = true }) {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [classData, setClassData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [studentData, setStudentData] = useState(new Map()); // Map<nim, {name, photo}>
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [lecturerData, setLecturerData] = useState(new Map()); // Map<staffId, {name, photo}>
  const [loadingLecturers, setLoadingLecturers] = useState(false);

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

  const classEntries = useMemo(() => {
    const entries = Object.values(classData || {});
    return entries.filter((entry) => {
      const room = entry?.kelas?.KodeRuang || "";
      return classId ? room.endsWith(classId) : true;
    });
  }, [classId, classData]);

  const selectedDayName = WEEKDAY_NAMES[selectedDate.getDay()];
  const timelineWidth = (endOfDayMinutes - startOfDayMinutes) * PX_PER_MINUTE;

  const dayEntries = useMemo(() => {
    return classEntries
      .filter((entry) => entry?.kelas?.hari === selectedDayName)
      .sort(
        (a, b) =>
          parseMinutes(a?.kelas?.mulai) - parseMinutes(b?.kelas?.mulai),
      );
  }, [classEntries, selectedDayName]);

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

    // Check if all students are already in cache
    const allCached = nims.every((nim) => hasStudentPhoto(nim));
    if (allCached) {
      // Load from cache immediately
      const cached = new Map();
      nims.forEach((nim) => {
        const data = getStudentFromCache(nim);
        if (data) cached.set(nim, data);
      });
      setStudentData(cached);
      return;
    }

    // Fetch missing students
    setLoadingStudents(true);
    fetchMultipleStudents(nims, (loaded, total) => {
      // Optional: update progress
      console.log(`Loading students: ${loaded}/${total}`);
    })
      .then((results) => {
        setStudentData(results);
      })
      .catch((error) => {
        console.error('Error fetching student data:', error);
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, [selectedCourse]);

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

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const handleDateClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedCourseId(null);
  };

  const handleEnterDashboard = () => {
    if (!classId) return;
    navigate(`/classoverview/${classId}/dashboard`);
  };

  return (
    <div className="classoverview-detail">
      <div className="classoverview-detail__row">
        <div className="classoverview-detail__column classoverview-detail__column--left">
          <div className="calendar-card">
            <div className="calendar-header">
              <button className="calendar-nav" onClick={handlePrevMonth}>
                ◀
              </button>
              <div className="calendar-title">
                {currentMonth.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <button className="calendar-nav" onClick={handleNextMonth}>
                ▶
              </button>
            </div>
            <div className="calendar-grid">
              {WEEKDAY_NAMES.map((day) => (
                <div key={day} className="calendar-weekday">
                  {day.slice(0, 3)}
                </div>
              ))}
              {calendarDays.map((date, index) => {
                const isSelected =
                  date &&
                  date.toDateString() === selectedDate.toDateString() &&
                  date.getMonth() === currentMonth.getMonth();
                return (
                  <button
                    key={`${date ? date.toISOString() : "empty"}-${index}`}
                    className={`calendar-day ${isSelected ? "selected" : ""} ${
                      !date ? "empty" : ""
                    }`}
                    onClick={() => handleDateClick(date)}
                    disabled={!date}
                  >
                    {date ? date.getDate() : ""}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="classoverview-detail__column classoverview-detail__column--right">
          <div className="timeline-card">
            <div className="timeline-header">
              <div>
                <h3>Timeline {selectedDayName}</h3>
                <p>Jadwal kelas pada tanggal terpilih</p>
              </div>
              {showEnterDashboard && (
                <button
                  className="enter-dashboard"
                  onClick={handleEnterDashboard}
                  disabled={!classId}
                >
                  Masuk Dashboard
                </button>
              )}
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

                {dayEntries.map((entry) => {
                  const start = parseMinutes(entry?.kelas?.mulai);
                  const end = parseMinutes(entry?.kelas?.selesai);
                  const left = Math.max(start - startOfDayMinutes, 0) * PX_PER_MINUTE;
                  const width = Math.max((end - start) * PX_PER_MINUTE, 120);
                  return (
                    <button
                      key={entry?.kelas?.IdCourse}
                      className={`timeline-event ${
                        selectedCourseId === entry?.kelas?.IdCourse ? "active" : ""
                      }`}
                      style={{ left, width }}
                      onClick={() => setSelectedCourseId(entry?.kelas?.IdCourse)}
                    >
                      <div className="timeline-event__time">
                        {formatTime(entry?.kelas?.mulai)} - {formatTime(entry?.kelas?.selesai)}
                      </div>
                      <div className="timeline-event__title">
                        {entry?.kelas?.Matakuliah}
                      </div>
                      <div className="timeline-event__subtitle">
                        {entry?.kelas?.KodeMk} • {entry?.kelas?.KodeRuang}
                      </div>
                    </button>
                  );
                })}

                  {loading && (
                    <div className="timeline-empty">Memuat data kelas...</div>
                  )}
                  {!loading && error && (
                    <div className="timeline-empty">{error}</div>
                  )}
                  {!loading && !error && dayEntries.length === 0 && (
                    <div className="timeline-empty">Tidak ada kelas di hari ini.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="classoverview-detail__row classoverview-detail__row--details">
        <div className="classoverview-detail__column classoverview-detail__column--left">
          <div className="detail-column">
            <h3>Detail Mata Kuliah</h3>
            {!loading && selectedCourse ? (
              <div className="detail-card detail-card--compact">
                <div className="detail-item">
                  <span>Nama</span>
                  <strong>{selectedCourse?.kelas?.Matakuliah}</strong>
                </div>
                <div className="detail-item">
                  <span>Kode MK</span>
                  <strong>{selectedCourse?.kelas?.KodeMk}</strong>
                </div>
                <div className="detail-item">
                  <span>Ruang</span>
                  <strong>{selectedCourse?.kelas?.KodeRuang}</strong>
                </div>
                <div className="detail-item">
                  <span>Waktu</span>
                  <strong>
                    {formatTime(selectedCourse?.kelas?.mulai)} - {formatTime(selectedCourse?.kelas?.selesai)}
                  </strong>
                </div>
                <div className="detail-item">
                  <span>ID Course</span>
                  <strong>{selectedCourse?.kelas?.IdCourse}</strong>
                </div>
              </div>
            ) : (
              <div className="detail-placeholder">
                {loading ? "Memuat detail mata kuliah..." : "Pilih mata kuliah dari timeline."}
              </div>
            )}
          </div>

          <div className="detail-column">
            <h3>Informasi Dosen</h3>
            {!loading && selectedCourse ? (
              <div className="detail-card detail-card--compact">
                {Object.values(selectedCourse?.dosen || {})
                  .filter((item) => typeof item === "object")
                  .map((dosen) => {
                    const staffId = dosen?.IdStaff || dosen?.StaffId;
                    const lecturerInfo = staffId ? lecturerData.get(staffId) : null;
                    const displayName = lecturerInfo?.name || dosen?.StaffName || "Dosen";
                    const photoSrc = resolvePhotoSrc(lecturerInfo?.photo);

                    return (
                      <div key={staffId || displayName} className="person-row">
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
                        <div>
                          <strong>{displayName}</strong>
                          <div className="muted">
                            {loadingLecturers && !lecturerInfo ? "Memuat..." : staffId}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="detail-placeholder">
                {loading ? "Memuat data dosen..." : "Pilih mata kuliah untuk melihat dosen."}
              </div>
            )}
          </div>
        </div>

        <div className="classoverview-detail__column classoverview-detail__column--right">
          <div className="detail-column">
            <h3>Daftar Mahasiswa</h3>
            {!loading && selectedCourse ? (
              <div className="detail-card detail-card--students">
                {(selectedCourse?.Std || []).map((student) => {
                  const nim = student?.nim;
                  const studentInfo = studentData.get(nim);
                  const displayName = studentInfo?.name || nim;
                  const isLoading = loadingStudents && !studentInfo;
                  const photoSrc = resolvePhotoSrc(studentInfo?.photo);
                  
                  return (
                    <div key={nim} className="person-row">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={displayName}
                          className="avatar"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = getPhotoPlaceholder();
                          }}
                        />
                      ) : (
                        <div className="avatar avatar--text">
                          {studentInfo?.name ? buildInitials(studentInfo.name) : buildInitials(nim || "?")}
                        </div>
                      )}
                      <div>
                        <strong>{displayName}</strong>
                        <div className="muted">
                          {isLoading ? "Memuat..." : studentInfo?.name ? nim : "Mahasiswa"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="detail-placeholder">
                {loading ? "Memuat data mahasiswa..." : "Pilih mata kuliah untuk melihat mahasiswa."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}