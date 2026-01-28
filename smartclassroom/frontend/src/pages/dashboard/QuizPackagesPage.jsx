import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quizRequest } from "../../api/quizClient";
import "./QuizPages.css";

const defaultForm = {
  title: "",
  description: "",
  topic: "",
};

const DURATION_OPTIONS = [15, 30, 45, 60];
const DURATION_STORAGE_KEY = "liveKuisDurationByPackage";
const SELECTION_STORAGE_KEY = "liveKuisSelection";

export default function QuizPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [durationByPackage, setDurationByPackage] = useState({});
  const navigate = useNavigate();
  const { classId } = useParams();
  const resolvedClassId = classId || "701";

  const loadPackages = async () => {
    setLoading(true);
    try {
      const response = await quizRequest("/api/quiz/packages/");
      const data = await response.json();
      setPackages(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(DURATION_STORAGE_KEY) || "{}");
    if (stored && typeof stored === "object") {
      setDurationByPackage(stored);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await quizRequest("/api/quiz/packages/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(defaultForm);
      await loadPackages();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (pkgId) => {
    if (!window.confirm("Hapus paket ini?")) return;
    try {
      await quizRequest(`/api/quiz/packages/${pkgId}/`, { method: "DELETE" });
      await loadPackages();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDurationChange = (pkgId, value) => {
    setDurationByPackage((prev) => {
      const next = { ...prev, [pkgId]: value };
      localStorage.setItem(DURATION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleStartKuis = (pkg) => {
    const duration = durationByPackage[pkg.id] || 30;
    localStorage.setItem(
      SELECTION_STORAGE_KEY,
      JSON.stringify({
        packageId: pkg.id,
        packageTitle: pkg.title,
        duration,
      })
    );
    sessionStorage.setItem("preferredDashboardMode", "kuis");
    navigate(`/classoverview/${resolvedClassId}/dashboard`);
  };

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <div>
          <h1>Paket Kuis</h1>
          <div className="quiz-subtitle">Kelola bank soal sebelum memulai kuis.</div>
        </div>
        <div className="quiz-pill">{packages.length} paket</div>
      </div>

      {/* 2-pane layout */}
      <div className="quiz-builder-panes">
        {/* Left pane: Create form */}
        <section className="quiz-pane quiz-pane-left">
          <div className="quiz-card">
            <h3>Buat Paket Baru</h3>
            <form className="quiz-form quiz-form--stack" onSubmit={handleCreate}>
              <label>
                Judul
                <input name="title" value={form.title} onChange={handleChange} required />
              </label>
              <label>
                Topik
                <input name="topic" value={form.topic} onChange={handleChange} />
              </label>
              <label>
                Deskripsi
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
              </label>
              {error && <p className="quiz-error">{error}</p>}
              <div className="quiz-submit-row">
                <button type="submit" className="quiz-button" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Right pane: Package list */}
        <section className="quiz-pane quiz-pane-right">
          <div className="quiz-card">
        {loading ? (
          <p>Memuat...</p>
        ) : (
          <table className="quiz-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Topik</th>
                <th>Soal</th>
                <th>Dibuat</th>
                <th>Durasi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td>
                    <button
                      className="quiz-link"
                      onClick={() =>
                        navigate(`/classoverview/${resolvedClassId}/dashboard/kuis/${pkg.id}`)
                      }
                    >
                      {pkg.title}
                    </button>
                  </td>
                  <td>{pkg.topic || "-"}</td>
                  <td>{pkg.question_count ?? pkg.questions?.length ?? 0}</td>
                  <td>{pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : "-"}</td>
                  <td>
                    <div className="quiz-duration">
                      <iconify-icon icon="mdi:timer-outline" width="16" height="16"></iconify-icon>
                      <select
                        value={durationByPackage[pkg.id] || 30}
                        onChange={(event) => handleDurationChange(pkg.id, Number(event.target.value))}
                      >
                        {DURATION_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value}s
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="quiz-actions">
                      <button className="quiz-icon-button" onClick={() => handleStartKuis(pkg)}>
                        <iconify-icon icon="mdi:play-circle" width="18" height="18"></iconify-icon>
                        Start
                      </button>
                      <button className="quiz-icon-button danger" onClick={() => handleDelete(pkg.id)}>
                        <iconify-icon icon="mdi:trash-can-outline" width="18" height="18"></iconify-icon>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan={6}>Belum ada paket</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
          </div>
        </section>
      </div>
    </div>
  );
}
