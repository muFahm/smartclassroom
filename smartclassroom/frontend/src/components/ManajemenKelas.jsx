import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Users,
  ClipboardCheck,
  Fingerprint,
  UserCheck,
  BarChart3,
  Thermometer,
} from "lucide-react";
import "./ManajemenKelas.css";

export default function ManajemenKelas({ onSelect, selectedClass }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: "jadwal-kelas", label: "Jadwal Kelas", icon: Users },
    { id: "kuis", label: "Kuis", icon: ClipboardCheck },
    {
      id: "registrasi-biometrik",
      label: "Registrasi Biometrik",
      icon: Fingerprint,
    },
    { id: "absensi", label: "Absensi", icon: UserCheck },
    { id: "polling-device", label: "Polling Device", icon: BarChart3 },
    { id: "light-temp", label: "Light & Temp", icon: Thermometer },
  ];

  const handleMenuClick = (id) => {
    if (id === "kuis") {
      navigate(`/classoverview/${selectedClass || "701"}/dashboard/kuis`);
      return;
    }
    if (onSelect) {
      onSelect(id);
    }
    navigate(`/classoverview/${selectedClass || "701"}/dashboard`);
  };

  return (
    <div className="manajemen-kelas-card">
      {/* Header - Clickable untuk toggle */}
      <div
        className="manajemen-kelas-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="manajemen-kelas-title">Manajemen Kelas</h3>
        <button className="toggle-button" aria-label="Toggle menu">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="manajemen-kelas-content">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="menu-item"
                onClick={() => handleMenuClick(item.id)}
              >
                <Icon size={16} className="menu-icon" />
                <span className="menu-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
