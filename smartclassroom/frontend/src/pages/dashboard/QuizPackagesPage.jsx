import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quizRequest } from "../../api/quizClient";
import "./QuizPages.css";

const defaultForm = {
  title: "",
  description: "",
  topic: "",
  visibility: "private",
};

export default function QuizPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <div>
          <h1>Paket Kuis</h1>
          <div className="quiz-subtitle">Kelola bank soal sebelum memulai kuis.</div>
        </div>
        <div className="quiz-pill">{packages.length} paket</div>
      </div>

      <section className="quiz-card">
        <h3>Buat Paket Baru</h3>
        <form className="quiz-form" onSubmit={handleCreate}>
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
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} />
          </label>
          <label>
            Visibilitas
            <select name="visibility" value={form.visibility} onChange={handleChange}>
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </select>
          </label>
          {error && <p className="quiz-error">{error}</p>}
          <button type="submit" className="quiz-button" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </section>

      <section className="quiz-card">
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td>
                    <button className="quiz-link" onClick={() => navigate(`/dashboard/kuis/${pkg.id}`)}>
                      {pkg.title}
                    </button>
                  </td>
                  <td>{pkg.topic || "-"}</td>
                  <td>{pkg.question_count ?? pkg.questions?.length ?? 0}</td>
                  <td>{pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : "-"}</td>
                  <td>
                    <button className="quiz-button danger" onClick={() => handleDelete(pkg.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr>
                  <td colSpan={5}>Belum ada paket</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
