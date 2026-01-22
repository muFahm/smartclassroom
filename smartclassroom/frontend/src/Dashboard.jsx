import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import PilihanKelas from "./components/PilihanKelas";
import DateTimeCard from "./components/DateTimeCard";
import Widget from "./components/Widget";
import Suhu from "./components/Suhu";
import Cahaya from "./components/Cahaya";
import PosisiKursi from "./components/PosisiKursi";
import ManajemenKelas from "./components/ManajemenKelas";
import Footer from "./components/Footer";
import "./Dashboard.css";

export default function Dashboard() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  // Mode aktif dashboard - DEFAULT "overview"
  const [activeMode, setActiveMode] = useState("overview");

  // Selected classroom
  const [selectedClass, setSelectedClass] = useState("701");

  // Visibility widgets - DEFAULT SEMUA TRUE untuk testing
  const [widgets, setWidgets] = useState({
    statistikPengenalan: true,
    aktivitasMahasiswa: true,
    klasifikasiGerakan: true,
    ekspresiSuara: true,
    ekspresiWajah: true,
    hasilPolling: true,
    transkripSuara: true,
    posisiKursi: true,
  });

  const location = useLocation();
  const previousModeRef = useRef(activeMode);

  useEffect(() => {
    if (location.pathname.startsWith("/dashboard/kuis")) {
      if (activeMode !== "kuis-page") {
        previousModeRef.current = activeMode;
        setActiveMode("kuis-page");
      }
    } else if (activeMode === "kuis-page") {
      setActiveMode(previousModeRef.current || "default");
    }
  }, [location.pathname, activeMode]);

  const getModeClass = () => `mode-${activeMode}`;

  const handleSelectClassFromOverview = (classId) => {
    setSelectedClass(classId);
    setActiveMode("default");
  };

  const handleMenuSelect = (id) => {
    const modeMap = {
      "ruang-kelas": "default",
      absensi: "default",
      "polling-device": "default",
      "light-temp": "default",
      "registrasi-biometrik": "default",
    };
    const nextMode = modeMap[id] || "default";
    setActiveMode(nextMode);
  };

  return (
    <>
      <Navbar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        isOverview={activeMode === "overview"}
      />

      <div
        className={`dashboard-container ${activeMode === "overview" ? "no-navbar" : ""}`}
      >
        <div
          className={`dashboard-grid ${activeMode === "overview" ? "overview-mode" : ""}`}
        >
          {/* ========================================== */}
          {/* SIDEBAR (HIDDEN saat OVERVIEW) */}
          {/* ========================================== */}
          {activeMode !== "overview" && (
            <div className="dashboard-left-column">
              <PilihanKelas
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                singleClassMode={true}
                singleClassValue={selectedClass}
              />
              <DateTimeCard />

              {/* Suhu & Cahaya - Side by Side */}
              <div className="sidebar-sensor-row">
                <Suhu />
                <Cahaya />
              </div>

              <PosisiKursi mode="sidebar" classroomId={selectedClass} />

              {/* Manajemen Kelas - Dropdown Menu */}
              <ManajemenKelas onSelect={handleMenuSelect} />

              {/* Widget Toggle - Tampilkan/Sembunyikan komponen */}
              <Widget
                key={activeMode}
                widgets={widgets}
                setWidgets={setWidgets}
                activeMode={activeMode}
              />
            </div>
          )}

          {/* ========================================== */}
          {/* MAIN AREA (DINAMIS - Berubah sesuai mode) */}
          {/* ========================================== */}
          <div className={`dashboard-right-column ${getModeClass()}`}>
            <Outlet
              context={{
                activeMode,
                setActiveMode,
                selectedClass,
                setSelectedClass,
                widgets,
                setWidgets,
                handleSelectClassFromOverview,
              }}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}