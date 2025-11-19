import React from "react";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-logo">Smart Classroom</h1>
      </div>

      <div className="navbar-center">
        <a href="#dashboard" className="navbar-link">
          Dashboard Utama
        </a>
        <a href="#kursi" className="navbar-link">
          Kursi & Polling
        </a>
        <a href="#mahasiswa" className="navbar-link">
          Aktivitas Mahasiswa
        </a>
        <a href="#suara" className="navbar-link">
          Aktivitas Suara
        </a>
        <a href="#wajah" className="navbar-link">
          Aktivitas Wajah
        </a>
      </div>

      <div className="navbar-right">
        <div className="navbar-user">
          <div className="navbar-user-avatar">
            <span>👤</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
