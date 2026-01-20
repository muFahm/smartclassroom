import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Ruang Kelas", path: "classrooms" },
  { label: "Paket Kuis", path: "quizzes" },
  { label: "Sesi Kuis", path: "sessions" },
  { label: "Polling Device", path: "devices" },
  { label: "Profil Saya", path: "profile" },
  { label: "Aktivitas", path: "activity" },
  { label: "Registrasi Wajah", path: "biometrics/face" },
  { label: "Registrasi Suara", path: "biometrics/voice" },
  { label: "Absensi", path: "attendance" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Link to="/dashboard">SmartClassroom</Link>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <p>{user?.email}</p>
          <button onClick={logout} className="secondary">
            Keluar
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
