import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";

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
      const response = await apiRequest("/api/quiz/packages/");
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
      await apiRequest("/api/quiz/packages/", {
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
      await apiRequest(`/api/quiz/packages/${pkgId}/`, { method: "DELETE" });
      await loadPackages();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Paket Kuis</h1>
          <p className="muted">Kelola bank soal sebelum memulai sesi.</p>
        </div>
      </header>

      <section className="card">
        <h2>Buat Paket Baru</h2>
        <form className="form grid" onSubmit={handleCreate}>
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
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Daftar Paket</h2>
          <span className="pill">{packages.length} paket</span>
        </div>
        {loading ? (
          <p>Memuat...</p>
        ) : (
          <table className="data-table">
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
                    <button className="link" onClick={() => navigate(`/dashboard/quizzes/${pkg.id}`)}>
                      {pkg.title}
                    </button>
                  </td>
                  <td>{pkg.topic || "-"}</td>
                  <td>{pkg.question_count}</td>
                  <td>{new Date(pkg.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="danger" onClick={() => handleDelete(pkg.id)}>
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
