import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../../api/client";

export default function ClassSessionDetailPage() {
  const { classSessionId } = useParams();
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState({ summary: "", transcript: "", status: "draft" });
  const [attendance, setAttendance] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const sessionRes = await apiRequest(`/api/classrooms/class-sessions/${classSessionId}/`);
      const sessionData = await sessionRes.json();
      setSession(sessionData);

      const notesRes = await apiRequest(`/api/classrooms/session-notes/?class_session=${classSessionId}`);
      const notesData = await notesRes.json();
      const normalizedNotes = notesData.results || notesData;
      setNotes(normalizedNotes);
      if (normalizedNotes.length) {
        setNoteDraft({
          summary: normalizedNotes[0].summary || "",
          transcript: normalizedNotes[0].transcript || "",
          status: normalizedNotes[0].status,
          id: normalizedNotes[0].id,
        });
      }

      if (sessionData.attendance_session) {
        const attRes = await apiRequest(`/api/accounts/attendance/sessions/${sessionData.attendance_session}/records/`);
        const attData = await attRes.json();
        setAttendance(attData);
      } else {
        setAttendance([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSessionId]);

  const handleSaveNote = async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      class_session: parseInt(classSessionId, 10),
      summary: noteDraft.summary,
      transcript: noteDraft.transcript,
      status: noteDraft.status,
    };
    try {
      if (noteDraft.id) {
        await apiRequest(`/api/classrooms/session-notes/${noteDraft.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/api/classrooms/session-notes/`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const triggerExport = async (format = "csv") => {
    setExporting(true);
    setError("");
    try {
      const response = await apiRequest(`/api/classrooms/class-sessions/${classSessionId}/export/`, {
        method: "POST",
        body: JSON.stringify({ format }),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session_${classSessionId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Sesi Kelas</p>
          <h1>{session ? session.topic || "Detail Sesi" : "Detail Sesi"}</h1>
          {session && <p className="muted">{session.course_class_name}</p>}
        </div>
        <button className="secondary" onClick={loadData} disabled={loading}>
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {session && (
        <section className="card">
          <div className="section-header">
            <h2>Info Sesi</h2>
            <span className="pill">{session.status}</span>
          </div>
          <div className="grid two">
            <div>
              <p className="muted">Topik</p>
              <p>{session.topic || "(Tidak ada)"}</p>
            </div>
            <div>
              <p className="muted">Agenda</p>
              <p>{session.agenda || "-"}</p>
            </div>
            <div>
              <p className="muted">Waktu Terjadwal</p>
              <p>
                {session.scheduled_start ? new Date(session.scheduled_start).toLocaleString() : "-"} s/d
                {" "}
                {session.scheduled_end ? new Date(session.scheduled_end).toLocaleString() : "-"}
              </p>
            </div>
            <div>
              <p className="muted">Ruang</p>
              <p>{session.classroom_code || "-"}</p>
            </div>
            <div>
              <p className="muted">Attendance Session</p>
              <p>{session.attendance_session || "-"}</p>
            </div>
            <div>
              <p className="muted">Quiz Session</p>
              <p>{session.quiz_session || "-"}</p>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-header">
          <h2>Notulensi (STT dummy)</h2>
          <button className="secondary" onClick={handleSaveNote}>
            Simpan
          </button>
        </div>
        <form className="form" onSubmit={handleSaveNote}>
          <label>
            Ringkasan
            <textarea
              rows={2}
              value={noteDraft.summary}
              onChange={(e) => setNoteDraft((prev) => ({ ...prev, summary: e.target.value }))}
            />
          </label>
          <label>
            Transkrip
            <textarea
              rows={6}
              value={noteDraft.transcript}
              onChange={(e) => setNoteDraft((prev) => ({ ...prev, transcript: e.target.value }))}
            />
          </label>
          <label>
            Status
            <select
              value={noteDraft.status}
              onChange={(e) => setNoteDraft((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </form>
        {notes.length > 1 && (
          <p className="muted">Catatan lain: {notes.length - 1} item tersimpan</p>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Absensi</h2>
          <span className="pill">{attendance.length} hadir</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>NIM</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((rec) => (
              <tr key={rec.id}>
                <td>{rec.recognized_name || "-"}</td>
                <td>{rec.student?.email || "-"}</td>
                <td>{rec.recognized_nim || "-"}</td>
                <td>{rec.timestamp ? new Date(rec.timestamp).toLocaleString() : "-"}</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr>
                <td colSpan={4}>Belum ada data absensi atau sesi absensi tidak terhubung.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Ekspor Data</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => triggerExport("csv")} disabled={exporting}>
              {exporting ? "Memproses..." : "Ekspor CSV"}
            </button>
            <button className="secondary" onClick={() => triggerExport("json")} disabled={exporting}>
              {exporting ? "Memproses..." : "Ekspor JSON"}
            </button>
          </div>
        </div>
        <p className="muted">Mengunduh sesi, absensi, dan ringkasan notulensi.</p>
      </section>
    </div>
  );
}
