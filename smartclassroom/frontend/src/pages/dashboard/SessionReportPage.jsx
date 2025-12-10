import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../api/client";

export default function SessionReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await apiRequest(`/api/quiz/analytics/sessions/${sessionId}/`);
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [sessionId]);

  if (loading) {
    return <p>Memuat laporan sesi...</p>;
  }

  if (error) {
    return (
      <div>
        <p className="error">{error}</p>
        <button className="secondary" onClick={() => navigate(-1)}>
          Kembali
        </button>
      </div>
    );
  }

  if (!summary) {
    return <p>Data laporan tidak tersedia.</p>;
  }

  const { session, question_stats: questionStats, scores } = summary;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Laporan Sesi</p>
          <h1>
            {session.code} - {session.package_title}
          </h1>
          <p>Status: {session.status}</p>
        </div>
        <button className="secondary" onClick={() => navigate(`/dashboard/sessions/${session.id}`)}>
          Kembali ke Kontrol
        </button>
      </header>

      <section className="card">
        <div className="section-header">
          <h2>Performa Pertanyaan</h2>
          <span className="pill">{questionStats.length} soal</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Pertanyaan</th>
              <th>Benar</th>
              <th>Total</th>
              <th>Akurasi</th>
            </tr>
          </thead>
          <tbody>
            {questionStats.map((stat) => (
              <tr key={stat.id}>
                <td>{stat.question_order}</td>
                <td>{stat.question_text}</td>
                <td>{stat.correct_responses}</td>
                <td>{stat.total_responses}</td>
                <td>{stat.accuracy.toFixed(1)}%</td>
              </tr>
            ))}
            {questionStats.length === 0 && (
              <tr>
                <td colSpan={5}>Belum ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Scoreboard Peserta</h2>
          <span className="pill">{scores.length} peserta</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nama</th>
              <th>Benar</th>
              <th>Total</th>
              <th>Akurasi</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => (
              <tr key={score.id}>
                <td>{score.participant_email}</td>
                <td>{score.participant_name || "-"}</td>
                <td>{score.correct_answers}</td>
                <td>{score.total_questions}</td>
                <td>{score.accuracy.toFixed(1)}%</td>
              </tr>
            ))}
            {scores.length === 0 && (
              <tr>
                <td colSpan={5}>Belum ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
