import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
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

  const location = useLocation();
  const { classId } = useParams();
  const navigate = useNavigate();

  const getInitialMode = (pathname) => {
    if (pathname === "/classoverview" || pathname === "/classoverview/") {
      return "overview";
    }
    if (pathname.includes("/dashboard/kuis")) return "kuis-page";
    if (pathname.includes("/dashboard")) return "default";
    return "default";
  };

  // Mode aktif dashboard
  const [activeMode, setActiveMode] = useState(getInitialMode(location.pathname));

  // Selected classroom
  const [selectedClass, setSelectedClass] = useState(classId || "701");

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

  const previousModeRef = useRef(activeMode);

  useEffect(() => {
    if (location.pathname === "/classoverview" || location.pathname === "/classoverview/") {
      if (activeMode !== "overview") {
        previousModeRef.current = activeMode;
        setActiveMode("overview");
      } else if (previousModeRef.current === "overview") {
        previousModeRef.current = "default";
      }
      return;
    }

    if (location.pathname.includes("/dashboard/kuis")) {
      if (activeMode !== "kuis-page") {
        previousModeRef.current = activeMode;
        setActiveMode("kuis-page");
      }
      return;
    }

    if (activeMode === "overview" || activeMode === "kuis-page") {
      setActiveMode(previousModeRef.current || "default");
    }
  }, [location.pathname, activeMode]);

  useEffect(() => {
    if (classId) {
      setSelectedClass(classId);
    }
  }, [classId]);

  useEffect(() => {
    if (location.state?.selectedClass) {
      setSelectedClass(location.state.selectedClass);
    }
  }, [location.state?.selectedClass]);

  const getModeClass = () => `mode-${activeMode}`;

  const handleMenuSelect = (id) => {
    const modeMap = {
      "jadwal-kelas": "jadwal-kelas",
      absensi: "absensi",
      "polling-device": "polling-device",
      "light-temp": "light-temp",
      "registrasi-biometrik": "registrasi-biometrik",
    };
    const nextMode = modeMap[id] || "default";
    setActiveMode(nextMode);
  };

  const shouldShowWidgetToggle = ![
    "jadwal-kelas",
    "kuis",
    "kuis-page",
    "registrasi-biometrik",
    "absensi",
    "polling-device",
    "light-temp",
  ].includes(activeMode);

  return (
    <>
      <Navbar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        isOverview={activeMode === "overview"}
        selectedClass={selectedClass}
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
                onClickSingle={() => navigate("/classoverview")}
              />
              <DateTimeCard />

              {/* Suhu & Cahaya - Side by Side */}
              {activeMode !== "light-temp" && (
                <div className="sidebar-sensor-row">
                  <Suhu />
                  <Cahaya />
                </div>
              )}

              <PosisiKursi mode="sidebar" classroomId={selectedClass} />

              {/* Manajemen Kelas - Dropdown Menu */}
              <ManajemenKelas onSelect={handleMenuSelect} selectedClass={selectedClass} />

              {/* Widget Toggle - Tampilkan/Sembunyikan komponen */}
              {shouldShowWidgetToggle && (
                <Widget
                  key={activeMode}
                  widgets={widgets}
                  setWidgets={setWidgets}
                  activeMode={activeMode}
                />
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MAIN AREA (DINAMIS - Berubah sesuai mode) */}
          {/* ========================================== */}
          <div className="dashboard-right-column">
            <div className={`dashboard-right-content ${getModeClass()}`}>
              <Outlet
                context={{
                  activeMode,
                  setActiveMode,
                  selectedClass,
                  setSelectedClass,
                  widgets,
                  setWidgets,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}