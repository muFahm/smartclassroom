import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/accounts/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user data to localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Handle error messages from backend
        if (data.errors) {
          const errorMsg = Object.values(data.errors).flat().join(', ');
          setError(errorMsg);
        } else {
          setError(data.message || 'Login gagal. Periksa username dan password Anda.');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan. Pastikan server backend berjalan.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Smart Classroom</h1>
          <p>Universitas Trisakti - FTI</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Login Admin Prodi</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

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
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Masukkan password"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>

          <div className="login-footer">
            <p>
              Belum terdaftar sebagai admin? 
              <button 
                type="button"
                className="link-button"
                onClick={() => navigate('/register')}
                disabled={loading}
              >
                Daftar admin
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
