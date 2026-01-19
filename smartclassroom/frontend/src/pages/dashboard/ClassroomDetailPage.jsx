import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../api/client";

function isoDateToday() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

export default function ClassroomDetailPage() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => isoDateToday(), []);

  const fetchDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const [roomRes, todayRes, historyRes] = await Promise.all([
        apiRequest(`/api/classrooms/classrooms/${classroomId}/`),
        apiRequest(`/api/classrooms/class-sessions/?classroom=${classroomId}&date_from=${today}&date_to=${today}`),
        apiRequest(`/api/classrooms/class-sessions/?classroom=${classroomId}&status=ended`),
      ]);

      const roomData = await roomRes.json();
      const todayData = await todayRes.json();
      const historyData = await historyRes.json();
      setRoom(roomData);
      setTodaySessions(todayData.results || todayData);
      setHistorySessions(historyData.results || historyData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  const renderSessionRow = (session) => (
    <tr key={session.id}>
      <td>{session.topic || "(Tanpa topik)"}</td>
      <td>{session.course_class_name}</td>
      <td>{session.status}</td>
      <td>{session.scheduled_start ? new Date(session.scheduled_start).toLocaleString() : "-"}</td>
      <td>
        <button className="secondary" onClick={() => navigate(`/dashboard/class-sessions/${session.id}`)}>
          Buka
        </button>
      </td>
    </tr>
  );

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Ruang Kelas</p>
          <h1>{room ? `${room.code} — ${room.name}` : "Detail Ruang"}</h1>
          {room && <p className="muted">{room.location || "Lokasi tidak diisi"}</p>}
        </div>
        <button className="secondary" onClick={fetchDetail} disabled={loading}>
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {room && (
        <section className="card">
          <div className="section-header">
            <h2>Info Ruang</h2>
            <span className="pill">Kapasitas {room.capacity}</span>
          </div>
          <div className="grid two">
            <div>
              <p className="muted">Kode</p>
              <p>{room.code}</p>
            </div>
            <div>
              <p className="muted">Nama</p>
              <p>{room.name}</p>
            </div>
            <div>
              <p className="muted">Lokasi</p>
              <p>{room.location || "-"}</p>
            </div>
            <div>
              <p className="muted">Status</p>
              <p>{room.is_active ? "Aktif" : "Nonaktif"}</p>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-header">
          <h2>Jadwal Hari Ini</h2>
          <span className="pill">{todaySessions.length} sesi</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Topik</th>
              <th>Mata Kuliah</th>
              <th>Status</th>
              <th>Waktu</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {todaySessions.map(renderSessionRow)}
            {!loading && todaySessions.length === 0 && (
              <tr>
                <td colSpan={5}>Tidak ada jadwal untuk hari ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Riwayat Sesi</h2>
          <span className="pill">{historySessions.length} sesi</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Topik</th>
              <th>Mata Kuliah</th>
              <th>Status</th>
              <th>Waktu</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {historySessions.map(renderSessionRow)}
            {!loading && historySessions.length === 0 && (
              <tr>
                <td colSpan={5}>Belum ada riwayat sesi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
