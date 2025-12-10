import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../api/client";

function ResultsBar({ distribution, total }) {
  if (!distribution || !total) return <p className="muted">Belum ada jawaban yang masuk.</p>;
  const entries = Object.entries(distribution);
  return (
    <div className="results-bar">
      {entries.map(([label, count]) => {
        const percent = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={label} className="results-bar__row">
            <span className="badge">{label}</span>
            <div className="results-bar__track">
              <div className="results-bar__fill" style={{ width: `${percent}%` }} />
            </div>
            <span>
              {count} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadSession = async () => {
    const response = await apiRequest(`/api/quiz/runtime/sessions/${sessionId}/`);
    const data = await response.json();
    setSession(data);
  };

  const loadParticipants = async () => {
    const response = await apiRequest(`/api/quiz/runtime/sessions/${sessionId}/participants/`);
    const data = await response.json();
    setParticipants(data);
  };

  const loadResults = async (sessionQuestionId) => {
    try {
      const query = sessionQuestionId ? `?session_question_id=${sessionQuestionId}` : "";
      const response = await apiRequest(`/api/quiz/runtime/sessions/${sessionId}/results/${query}`);
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setResults(null);
    }
  };

  useEffect(() => {
    Promise.all([loadSession(), loadParticipants()])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (!session?.current_question) {
      setResults(null);
      return;
    }
    loadResults(session.current_question);
    const interval = setInterval(() => loadResults(session.current_question), 3000);
    return () => clearInterval(interval);
  }, [session?.current_question]);

  const handleAction = async (path, body) => {
    setError("");
    setActionMessage("");
    try {
      await apiRequest(`/api/quiz/runtime/sessions/${sessionId}/${path}/`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      await loadSession();
      await loadParticipants();
      setActionMessage("Perintah berhasil dijalankan");
    } catch (err) {
      setError(err.message);
    }
  };

  const startSession = () => handleAction("start");
  const closeQuestion = () => handleAction("close_question");
  const revealAnswer = () => handleAction("reveal_answer");
  const endSession = () => handleAction("end");

  const openQuestion = (sessionQuestionId) => handleAction("open_question", { session_question_id: sessionQuestionId });

  const currentQuestion = useMemo(() => {
    if (!session || !session.current_question) return null;
    return session.questions.find((q) => q.id === session.current_question) || null;
  }, [session]);

  if (loading) {
    return <p>Memuat detail sesi...</p>;
  }

  if (!session) {
    return (
      <div>
        <p>Sesi tidak ditemukan.</p>
        <button className="secondary" onClick={() => navigate("/dashboard/sessions")}>Kembali</button>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Kode Sesi</p>
          <h1>
            {session.code} <small className="muted">({session.status})</small>
          </h1>
          <p>{session.package_title}</p>
        </div>
        <div className="grid two" style={{ maxWidth: 320 }}>
          <button className="secondary" onClick={() => navigator.clipboard.writeText(session.code)}>
            Salin Kode
          </button>
          <button onClick={() => navigate(`/dashboard/sessions/${session.id}/report`)}>Lihat Laporan</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {actionMessage && <p className="muted">{actionMessage}</p>}

      <section className="card">
        <div className="section-header">
          <h2>Kendali Sesi</h2>
        </div>
        <div className="grid two">
          <div>
            <p className="muted">Status</p>
            <h3>{session.status.toUpperCase()}</h3>
            <div className="grid two" style={{ marginTop: "1rem" }}>
              <button onClick={startSession} disabled={session.status !== "draft"}>
                Mulai
              </button>
              <button onClick={endSession} className="danger" disabled={session.status === "closed"}>
                Akhiri
              </button>
            </div>
          </div>
          <div>
            <p className="muted">Pertanyaan Aktif</p>
            {currentQuestion ? (
              <div>
                <strong>
                  #{currentQuestion.order}: {currentQuestion.question_text}
                </strong>
                <div className="grid two" style={{ marginTop: "0.5rem" }}>
                  <button onClick={closeQuestion} disabled={!currentQuestion.is_open}>
                    Tutup Polling
                  </button>
                  <button onClick={revealAnswer} disabled={!currentQuestion.opened_at}>
                    Tampilkan Jawaban
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">Belum ada pertanyaan yang dibuka.</p>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Daftar Pertanyaan</h2>
          <span className="pill">{session.questions.length} soal</span>
        </div>
        <ul className="question-list">
          {session.questions.map((question) => (
            <li key={question.id}>
              <div>
                <strong>
                  #{question.order} - {question.question_text}
                </strong>
                <p className="muted">
                  Status: {question.is_open ? "Terbuka" : question.revealed_at ? "Jawaban ditampilkan" : "Tertutup"}
                </p>
              </div>
              <div className="grid two" style={{ maxWidth: 260 }}>
                <button onClick={() => openQuestion(question.id)} disabled={session.status === "closed"}>
                  Buka Pertanyaan
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Grafik Jawaban</h2>
          <span className="pill">Total {results?.total_responses || 0} jawaban</span>
        </div>
        <ResultsBar distribution={results?.distribution} total={results?.total_responses} />
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Peserta Terhubung</h2>
          <span className="pill">{participants.length} peserta</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nama</th>
              <th>Device</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.id}>
                <td>{participant.user_email}</td>
                <td>{participant.user_name || "-"}</td>
                <td>{participant.device_code || "-"}</td>
                <td>{participant.status}</td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={4}>Belum ada peserta yang bergabung.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
