import React, { useState } from "react";
import Navbar from "./components/Navbar";
import PilihanKelas from "./components/PilihanKelas";
import DateTimeCard from "./components/DateTimeCard";
import Widget from "./components/Widget";
import Suhu from "./components/Suhu";
import Cahaya from "./components/Cahaya";
import PosisiKursi from "./components/PosisiKursi";
import HasilPolling from "./components/HasilPolling";
import TranskripSuara from "./components/TranskripSuara";
import EkspresiSuara from "./components/EkspresiSuara";
import EkspresiWajah from "./components/EkspresiWajah";
import KlasifikasiGerakan from "./components/KlasifikasiGerakan";
import AktivitasMahasiswa from "./components/AktivitasMahasiswa";
import StatistikPengenalan from "./components/StatistikPengenalan";
import Footer from "./components/Footer";
import "./Dashboard.css";

export default function Dashboard() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  // Mode aktif dashboard (default, kuis, diskusi, kolaborasi, presentasi, brainstorming, belajar, praktikum)
  const [activeMode, setActiveMode] = useState('default');
  
  // Visibility widgets (dipindahkan dari Widget.jsx untuk centralized control)
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

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  // Mengembalikan class CSS berdasarkan mode aktif
  const getModeClass = () => {
    return `mode-${activeMode}`;
  };

  return (
    <>
      <Navbar activeMode={activeMode} setActiveMode={setActiveMode} />

      <div className="dashboard-container">
        <div className="dashboard-grid">
          {/* ========================================== */}
          {/* SIDEBAR (STATIS - Tidak berubah di semua mode) */}
          {/* ========================================== */}
          <div className="dashboard-left-column">
            <PilihanKelas />
            <DateTimeCard />
            
            {/* Suhu & Cahaya - Side by Side */}
            <div className="sidebar-sensor-row">
              <Suhu />
              <Cahaya />
            </div>
            
            <PosisiKursi mode="sidebar" />
            <Widget widgets={widgets} setWidgets={setWidgets} />
          </div>

          {/* ========================================== */}
          {/* MAIN AREA (DINAMIS - Berubah sesuai mode) */}
          {/* ========================================== */}
          <div className={`dashboard-right-column ${getModeClass()}`}>
            
            {/* Posisi Kursi (Visual Denah) - Muncul di mode default & kolaborasi */}
            {widgets.posisiKursi && (
              <div className="widget-wrapper grid-posisi-denah">
                <PosisiKursi mode="denah" />
              </div>
            )}

            {/* Hasil Polling */}
            {widgets.hasilPolling && (
              <div className="widget-wrapper grid-polling">
                <HasilPolling />
              </div>
            )}

            {/* Transkrip Suara */}
            {widgets.transkripSuara && (
              <div className="widget-wrapper grid-transkrip">
                <TranskripSuara />
              </div>
            )}

            {/* Charts Grid Container - 4 chart dalam 1 grid */}
            <div className="charts-container">
              {/* Ekspresi Suara */}
              {widgets.ekspresiSuara && (
                <div className="widget-wrapper grid-ekspresi-suara">
                  <EkspresiSuara />
                </div>
              )}

              {/* Ekspresi Wajah */}
              {widgets.ekspresiWajah && (
                <div className="widget-wrapper grid-ekspresi-wajah">
                  <EkspresiWajah />
                </div>
              )}

              {/* Klasifikasi Gerakan */}
              {widgets.klasifikasiGerakan && (
                <div className="widget-wrapper grid-gerakan">
                  <KlasifikasiGerakan />
                </div>
              )}

              {/* Aktivitas Mahasiswa */}
              {widgets.aktivitasMahasiswa && (
                <div className="widget-wrapper grid-aktivitas">
                  <AktivitasMahasiswa />
                </div>
              )}
            </div>

            {/* Statistik Pengenalan (Suara & Wajah) */}
            {widgets.statistikPengenalan && (
              <div className="widget-wrapper grid-statistik">
                <StatistikPengenalan />
              </div>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
