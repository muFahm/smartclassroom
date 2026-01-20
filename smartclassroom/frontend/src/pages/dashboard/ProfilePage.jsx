import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: "", nim: "", major: "", enrollment_year: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProfile = async () => {
    setError("");
    const res = await apiRequest("/api/accounts/me/");
    const data = await res.json();
    setProfile(data);
    setForm({
      full_name: data.full_name || "",
      nim: data.nim || "",
      major: data.major || "",
      enrollment_year: data.enrollment_year || "",
      avatar_url: data.avatar_url || "",
    });
  };

  useEffect(() => {
    loadProfile().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/api/accounts/me/", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: form.full_name,
          nim: form.nim,
          major: form.major,
          enrollment_year: form.enrollment_year ? Number(form.enrollment_year) : null,
          avatar_url: form.avatar_url,
        }),
      });
      setMessage("Profil diperbarui.");
      await loadProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Memuat profil...</p>;
  if (!profile) return <p className="error">Gagal memuat profil.</p>;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Profil Mahasiswa</p>
          <h1>{profile.full_name || profile.username || profile.email}</h1>
          <p className="muted">{profile.email}</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <section className="card">
        <h2>Data Pribadi</h2>
        <form className="form grid two" onSubmit={handleSave}>
          <label>
            Nama Lengkap
            <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Nama lengkap" />
          </label>
          <label>
            NIM
            <input name="nim" value={form.nim} onChange={handleChange} placeholder="NIM" />
          </label>
          <label>
            Program Studi
            <input name="major" value={form.major} onChange={handleChange} placeholder="Informatika" />
          </label>
          <label>
            Tahun Masuk
            <input name="enrollment_year" value={form.enrollment_year} onChange={handleChange} placeholder="2022" />
          </label>
          <label>
            Avatar URL
            <input name="avatar_url" value={form.avatar_url} onChange={handleChange} placeholder="https://..." />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
