import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      const response = await apiRequest("/api/quiz/runtime/sessions/");
      const data = await response.json();
      setSessions(data.results || data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await apiRequest("/api/quiz/packages/?is_archived=false");
      const data = await response.json();
      setPackages(data.results || data);
      if (!selectedPackage && (data.results || data).length) {
        setSelectedPackage((data.results || data)[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!selectedPackage) return;
    setCreating(true);
    setError("");
    try {
      const response = await apiRequest("/api/quiz/runtime/sessions/", {
        method: "POST",
        body: JSON.stringify({ package: selectedPackage }),
      });
      const data = await response.json();
      await fetchSessions();
      navigate(`/dashboard/sessions/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Pelaksanaan Kuis</p>
          <h1>Manajemen Sesi</h1>
        </div>
        <button className="secondary" onClick={fetchSessions}>
          Refresh
        </button>
      </header>

      <section className="card">
        <h2>Buat Sesi Baru</h2>
        <form className="form grid two" onSubmit={handleCreate}>
          <label>
            Pilih Paket
            <select value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value)}>
              <option value="">-- pilih paket --</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={!selectedPackage || creating}>
              {creating ? "Membuat..." : "Mulai Draft"}
            </button>
          </div>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Riwayat Sesi</h2>
          <span className="pill">{sessions.length} sesi</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Paket</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.code}</td>
                <td>{session.package_title}</td>
                <td>{session.status}</td>
                <td>{new Date(session.created_at).toLocaleString()}</td>
                <td>
                  <button className="secondary" onClick={() => navigate(`/dashboard/sessions/${session.id}`)}>
                    Buka
                  </button>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5}>Belum ada sesi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
