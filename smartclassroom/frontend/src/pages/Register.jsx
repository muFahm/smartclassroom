import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { detectRoleFromEmail, UserRole } from "../services/authDataService";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    position: "admin", // Will be auto-detected from email
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedRole, setDetectedRole] = useState(null);
  const [emailValidation, setEmailValidation] = useState({ isValid: false, message: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate email against university database when email changes
  useEffect(() => {
    if (formData.email && formData.email.includes("@")) {
      const result = detectRoleFromEmail(formData.email);
      setDetectedRole(result.role);
      
      if (result.isValid) {
        setEmailValidation({ 
          isValid: true, 
          message: result.role === UserRole.MAHASISWA 
            ? "✓ Terdeteksi sebagai Mahasiswa" 
            : `✓ Terdeteksi sebagai Dosen${result.dosenName ? ` (${result.dosenName})` : ""}`
        });
        // Auto-set position based on detected role
        setFormData(prev => ({
          ...prev,
          position: result.role === UserRole.MAHASISWA ? "mahasiswa" : "admin"
        }));
      } else if (result.errorMessage) {
        setEmailValidation({ isValid: false, message: result.errorMessage });
      } else {
        setEmailValidation({ isValid: false, message: "" });
      }
    } else {
      setDetectedRole(null);
      setEmailValidation({ isValid: false, message: "" });
    }
  }, [formData.email]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error when user types
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Password dan konfirmasi password tidak sama");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Email tidak valid");
      return false;
    }
    // Validate university email
    if (!emailValidation.isValid) {
      setError(emailValidation.message || "Email universitas tidak valid");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/accounts/register/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            confirm_password: formData.confirmPassword,
            full_name: formData.fullName,
            position: formData.position,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // Redirect to login page after successful registration
        alert("Registrasi berhasil! Silakan login dengan akun Anda.");
        navigate("/login");
      } else {
        // Handle error messages from backend
        if (data.errors) {
          const errorMsg = Object.values(data.errors).flat().join(", ");
          setError(errorMsg);
        } else {
          setError(data.message || "Registrasi gagal. Coba lagi.");
        }
      }
    } catch (err) {
      setError("Terjadi kesalahan. Pastikan server backend berjalan.");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper">
        {/* Left side - Illustration */}
        <div className="register-illustration">
          <div className="illustration-content">
            <img 
              src="/study-illustration.png" 
              alt="Smart Classroom Illustration"
              className="illustration-image"
            />
            <h2>Bergabung dengan Smart Classroom</h2>
            <p>Daftarkan diri Anda untuk akses penuh ke platform pembelajaran interaktif</p>
          </div>
        </div>

        {/* Right side - Register Card */}
        <div className="register-card">
          <div className="register-header">
            <h1>Smart Classroom</h1>
            <p>Universitas Trisakti - FTI</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            <h2>Daftar Akun</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="fullName">Nama Lengkap</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Masukkan username"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Universitas</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nim@std.trisakti.ac.id atau kode@trisakti.ac.id"
                required
                disabled={loading}
                className={emailValidation.isValid ? "input-valid" : (emailValidation.message ? "input-invalid" : "")}
              />
              {emailValidation.message && (
                <span className={`email-validation ${emailValidation.isValid ? "valid" : "invalid"}`}>
                  {emailValidation.message}
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimal 6 karakter"
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

              <div className="form-group">
                <label htmlFor="confirmPassword">Konfirmasi Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Ulangi password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <iconify-icon 
                      icon={showConfirmPassword ? "ph:eye" : "ph:eye-closed"} 
                      width="20" 
                      height="20"
                    ></iconify-icon>
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-register" disabled={loading}>
              {loading ? "Loading..." : "Daftar"}
            </button>

            <div className="register-footer">
              <p>
                Sudah punya akun?
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate("/login")}
                  disabled={loading}
                >
                  Login di sini
                </button>
              </p>
              <p className="email-hint">
                Mahasiswa: nim@std.trisakti.ac.id<br/>
                Dosen: kode@trisakti.ac.id
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
