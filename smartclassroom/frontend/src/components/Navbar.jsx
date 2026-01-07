import React from "react";
import "./Navbar.css";

export default function Navbar({ activeMode, setActiveMode }) {
  const modes = [
    { id: "default", label: "Dashboard Utama" },
    { id: "kuis", label: "Kuis" },
    { id: "diskusi", label: "Diskusi" },
    { id: "kolaborasi", label: "Kolaborasi" },
    { id: "presentasi", label: "Presentasi" },
    { id: "brainstorming", label: "Brainstorming" },
    { id: "belajar", label: "Belajar" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-logo">Smart Classroom</h1>
      </div>

      <div className="navbar-center">
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={`navbar-link ${activeMode === mode.id ? "active" : ""}`}
            onClick={() => setActiveMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
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
