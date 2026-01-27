import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { detectRoleFromEmail, UserRole } from "../services/authDataService";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/accounts/login/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // Save token and user data to sessionStorage (logout on browser close)
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));

        // Detect role from user email and redirect accordingly
        const userEmail = data.user.email;
        const roleDetection = detectRoleFromEmail(userEmail);
        
        // Store user role in sessionStorage
        sessionStorage.setItem("userRole", roleDetection.role);

        // Redirect based on role
        if (roleDetection.role === UserRole.MAHASISWA) {
          navigate("/mahasiswa");
        } else {
          // Dosen or Admin - redirect to classoverview
          navigate("/classoverview");
        }
      } else {
        // Handle error messages from backend
        if (data.errors) {
          const errorMsg = Object.values(data.errors).flat().join(", ");
          setError(errorMsg);
        } else {
          setError(
            data.message || "Login gagal. Periksa username dan password Anda.",
          );
        }
      }
    } catch (err) {
      setError("Terjadi kesalahan. Pastikan server backend berjalan.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left side - Illustration */}
        <div className="login-illustration">
          <div className="illustration-content">
            <img 
              src="/study-illustration.png" 
              alt="Smart Classroom Illustration"
              className="illustration-image"
            />
            <h2>Selamat Datang di Smart Classroom</h2>
            <p>Platform pembelajaran interaktif untuk Universitas Trisakti</p>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="login-card">
          <div className="login-header">
            <h1>Smart Classroom</h1>
            <p>Universitas Trisakti - FTI</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Login</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">Username atau Email</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Masukkan username atau email"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Masukkan password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <iconify-icon 
                    icon={showPassword ? "ph:eye" : "ph:eye-closed"} 
                    width="20" 
                    height="20"
                  ></iconify-icon>
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="login-footer">
              <p>
                Belum punya akun?
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate("/register")}
                  disabled={loading}
                >
                  Daftar di sini
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
