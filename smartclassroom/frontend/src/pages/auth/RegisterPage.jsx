import React, { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "student",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || "http://localhost:8000"}/api/accounts/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("Pendaftaran berhasil! Silakan login.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError("Gagal mendaftar: " + JSON.stringify(data.errors || data.error || "Unknown error"));
      }
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div>
        <h2>Daftar Akun Baru</h2>
        <p className="muted">Buat akun untuk mengakses sistem smart classroom.</p>
      </div>
      <form onSubmit={handleRegister} className="form">
        <label>
          Nama Lengkap
          <input
            type="text"
            name="username"
            placeholder="Nama Lengkap"
            value={form.username}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Email Kampus
          <input
            type="email"
            name="email"
            placeholder="email@universitas.ac.id"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            placeholder="••••••"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Tipe Akun
          <div style={{ marginTop: "8px" }}>
            <label style={{ marginRight: "15px" }}>
              <input
                type="radio"
                name="role"
                value="student"
                checked={form.role === "student"}
                onChange={handleChange}
              />{" "}
              Mahasiswa
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="lecturer"
                checked={form.role === "lecturer"}
                onChange={handleChange}
              />{" "}
              Dosen/Admin
            </label>
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Mendaftar..." : "Daftar"}
        </button>
      </form>
      <p style={{ marginTop: "15px", textAlign: "center" }}>
        Sudah punya akun? <Link to="/login">Masuk di sini</Link>
      </p>
    </div>
  );
}
