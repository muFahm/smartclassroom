import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export default function ActivityPage() {
  const [schedule, setSchedule] = useState([]);
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setError("");
    const [schRes, resRes, noteRes, logRes] = await Promise.all([
      apiRequest("/api/accounts/me/schedule/"),
      apiRequest("/api/accounts/me/results/"),
      apiRequest("/api/accounts/me/notes/"),
      apiRequest("/api/accounts/me/activity/"),
    ]);
    setSchedule(await schRes.json());
    setResults(await resRes.json());
    setNotes(await noteRes.json());
    setLogs(await logRes.json());
  };

  useEffect(() => {
    loadAll().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Memuat aktivitas...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Aktivitas & Laporan</p>
          <h1>Ringkasan Mahasiswa</h1>
        </div>
        <button className="secondary" onClick={() => { setLoading(true); loadAll().catch((err)=>setError(err.message)).finally(()=>setLoading(false)); }}>
          Refresh
        </button>
      </header>

      <section className="card">
        <div className="section-header">
          <h2>Jadwal Mendatang</h2>
          <span className="pill">{schedule.length}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Mata Kuliah</th>
              <th>Topik</th>
              <th>Waktu</th>
              <th>Kelas</th>
              <th>Dosen</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((s) => (
              <tr key={s.id}>
                <td>{s.course_code} - {s.course_name}</td>
                <td>{s.topic}</td>
                <td>{s.scheduled_start ? new Date(s.scheduled_start).toLocaleString() : "-"}</td>
                <td>{s.classroom || "-"}</td>
                <td>{s.lecturer || "-"}</td>
              </tr>
            ))}
            {schedule.length === 0 && (
              <tr><td colSpan={5}>Tidak ada jadwal dalam 14 hari ke depan.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Nilai Kuis</h2>
          <span className="pill">{results.length}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Sesi</th>
              <th>Paket</th>
              <th>Benar</th>
              <th>Total</th>
              <th>Akurasi</th>
              <th>Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const acc = r.total ? Math.round((r.correct / r.total) * 100) : 0;
              return (
                <tr key={r.session_id}>
                  <td>{r.session_code}</td>
                  <td>{r.package_title}</td>
                  <td>{r.correct}</td>
                  <td>{r.total}</td>
                  <td>{acc}%</td>
                  <td>{r.last_submitted ? new Date(r.last_submitted).toLocaleString() : "-"}</td>
                </tr>
              );
            })}
            {results.length === 0 && (
              <tr><td colSpan={6}>Belum ada hasil kuis.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Notulensi & Ringkasan</h2>
          <span className="pill">{notes.length}</span>
        </div>
        <ul className="question-list">
          {notes.map((n) => (
            <li key={n.id}>
              <div>
                <strong>{n.course_name}</strong>
                <p className="muted">Topik: {n.topic || "-"}</p>
                <p>{n.summary || (n.transcript ? `${n.transcript.slice(0, 180)}...` : "Tidak ada ringkasan")}</p>
              </div>
              <div className="muted" style={{ fontSize: "0.9rem" }}>
                Diperbarui: {n.updated_at ? new Date(n.updated_at).toLocaleString() : "-"}
              </div>
            </li>
          ))}
          {notes.length === 0 && <p className="muted">Belum ada notulensi.</p>}
        </ul>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Log Aktivitas</h2>
          <span className="pill">{logs.length}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Jenis</th>
              <th>Pesan</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.activity_type}</td>
                <td>{l.message || JSON.stringify(l.metadata || {})}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={3}>Belum ada aktivitas.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
