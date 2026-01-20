import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser } from "../utils/auth";
import "./Navbar.css";

export default function Navbar({ activeMode, setActiveMode }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const user = getUser();

  const modes = [
    { id: "default", label: "Dashboard Utama" },
    { id: "kuis", label: "Kuis" },
    { id: "diskusi", label: "Diskusi" },
    { id: "kolaborasi", label: "Kolaborasi" },
    { id: "presentasi", label: "Presentasi" },
    { id: "brainstorming", label: "Brainstorming" },
    { id: "belajar", label: "Belajar" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
        <div 
          className="navbar-user"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div className="navbar-user-avatar">
            <span>👤</span>
          </div>
          {showDropdown && (
            <div className="navbar-dropdown">
              <div className="navbar-dropdown-header">
                <p className="navbar-dropdown-name">{user?.username || 'Admin'}</p>
                <p className="navbar-dropdown-role">Admin Prodi</p>
              </div>
              <button 
                className="navbar-dropdown-logout"
                onClick={handleLogout}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
