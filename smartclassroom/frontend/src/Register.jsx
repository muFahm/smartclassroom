import React, { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "student",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    const res = await fetch("http://localhost:8000/api/accounts/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (data.success) {
      setMessage("Pendaftaran berhasil! Silakan login.");
    } else {
      setMessage("Gagal mendaftar: " + JSON.stringify(data.errors));
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto" }}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          name="username"
          placeholder="Nama Lengkap"
          onChange={handleChange}
          required
        /><br />
        <input
          type="email"
          name="email"
          placeholder="Email Kampus"
          onChange={handleChange}
          required
        /><br />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        /><br />
        <label>
          <input
            type="radio"
            name="role"
            value="student"
            checked={form.role === "student"}
            onChange={handleChange}
          />{" "}
          Mahasiswa
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="role"
            value="lecturer"
            checked={form.role === "lecturer"}
            onChange={handleChange}
          />{" "}
          Dosen/Admin
        </label>
        <br />
        <button type="submit">Daftar</button>
      </form>
      {message && <p>{message}</p>}
      <p>
        Sudah punya akun? <a href="/">Login</a>
      </p>
    </div>
  );
}
