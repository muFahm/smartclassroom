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
import SoalKuis from "./components/SoalKuis";
import ClassroomOverview from "./components/ClassroomOverview";
import Footer from "./components/Footer";
import { KUIS_ACTIVE } from "./utils/mockData";
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

  // ========================================
  // DEBUG - Bisa dihapus nanti
  // ========================================
  console.log("🎯 Dashboard - Active Mode:", activeMode);
  console.log("📊 Dashboard - Widgets:", widgets);

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  // Mengembalikan class CSS berdasarkan mode aktif
  const getModeClass = () => {
    return `mode-${activeMode}`;
  };

  // Handle select classroom dari overview
  const handleSelectClassFromOverview = (classId) => {
    setSelectedClass(classId);
    setActiveMode("default");
  };

  return (
    <>
      <Navbar activeMode={activeMode} setActiveMode={setActiveMode} isOverview={activeMode === "overview"} />

      <div className={`dashboard-container ${activeMode === "overview" ? "no-navbar" : ""}`}>
        <div className={`dashboard-grid ${activeMode === "overview" ? "overview-mode" : ""}`}>
          {/* ========================================== */}
          {/* SIDEBAR (HIDDEN saat OVERVIEW) */}
          {/* ========================================== */}
          {activeMode !== "overview" && (
          <div className="dashboard-left-column">
            <PilihanKelas 
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
            <DateTimeCard />

            {/* Suhu & Cahaya - Side by Side */}
            <div className="sidebar-sensor-row">
              <Suhu />
              <Cahaya />
            </div>

            <PosisiKursi mode="sidebar" classroomId={selectedClass} />

            {/* ✅ Widget dengan activeMode prop */}
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
            {/* ==================== MODE OVERVIEW ==================== */}
            {activeMode === "overview" && (
              <ClassroomOverview onSelectClass={handleSelectClassFromOverview} />
            )}

            {/* ==================== MODE DEFAULT ==================== */}
            {activeMode === "default" && (
              <>
                {/* Posisi Kursi (Visual Denah) */}
                {widgets.posisiKursi && (
                  <div className="widget-wrapper grid-posisi-denah">
                    <PosisiKursi mode="denah" classroomId={selectedClass} />
                  </div>
                )}

                {/* Hasil Polling */}
                {widgets.hasilPolling && (
                  <div className="widget-wrapper grid-polling">
                    <HasilPolling mode="default" />
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
              </>
            )}

            {/* ==================== MODE KUIS ==================== */}
            {activeMode === "kuis" && (
              <>
                {/* Left Main - Prioritas Utama */}
                <div className="grid-left-main">
                  {/* 1. Soal Kuis - Top */}
                  <div className="widget-wrapper grid-soal">
                    <SoalKuis soal={KUIS_ACTIVE} />
                  </div>

                  {/* 2. Hasil Polling - Middle (PRIORITAS UTAMA - BESAR) */}
                  {widgets.hasilPolling && (
                    <div className="widget-wrapper grid-polling">
                      <HasilPolling mode="kuis" />
                    </div>
                  )}

                  {/* 3. Mini Realtime Bar - Bottom (Ekspresi Wajah + Suara) */}
                  <div className="grid-mini-realtime">
                    {/* Ekspresi Wajah - Prioritas Rendah (Mini) */}
                    {widgets.ekspresiWajah && (
                      <div className="widget-wrapper grid-ekspresi-wajah-mini">
                        <EkspresiWajah />
                      </div>
                    )}

                    {/* Ekspresi Suara - Prioritas Rendah (Mini) */}
                    {widgets.ekspresiSuara && (
                      <div className="widget-wrapper grid-ekspresi-suara-mini">
                        <EkspresiSuara />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Sidebar - Prioritas Menengah (3 Widgets) */}
                <div className="grid-right-sidebar">
                  {/* 1. Klasifikasi Gerakan */}
                  {widgets.klasifikasiGerakan && (
                    <div className="widget-wrapper grid-klasifikasi">
                      <KlasifikasiGerakan />
                    </div>
                  )}

                  {/* 2. Transkrip Suara */}
                  {widgets.transkripSuara && (
                    <div className="widget-wrapper grid-transkrip">
                      <TranskripSuara />
                    </div>
                  )}

                  {/* 3. Statistik Pengenalan */}
                  {widgets.statistikPengenalan && (
                    <div className="widget-wrapper grid-statistik">
                      <StatistikPengenalan />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==================== MODE KOLABORASI ==================== */}
            {activeMode === "kolaborasi" && (
              <>
                {/* Column 1 - Posisi Kursi (Full Height) */}
                {widgets.posisiKursi && (
                  <div className="widget-wrapper grid-col1">
                    <PosisiKursi mode="denah" showStats={true} classroomId={selectedClass} />
                  </div>
                )}

                {/* Column 2 - Ekspresi Suara + Klasifikasi */}
                <div className="grid-col2">
                  {/* Ekspresi Suara */}
                  {widgets.ekspresiSuara && (
                    <div className="widget-wrapper grid-ekspresi-suara-col2">
                      <EkspresiSuara />
                    </div>
                  )}

                  {/* Klasifikasi Gerakan */}
                  {widgets.klasifikasiGerakan && (
                    <div className="widget-wrapper grid-klasifikasi-col2">
                      <KlasifikasiGerakan />
                    </div>
                  )}
                </div>

                {/* Column 3 - Ekspresi Wajah + Aktivitas */}
                <div className="grid-col3">
                  {/* Ekspresi Wajah */}
                  {widgets.ekspresiWajah && (
                    <div className="widget-wrapper grid-ekspresi-wajah-col3">
                      <EkspresiWajah />
                    </div>
                  )}

                  {/* Aktivitas Mahasiswa */}
                  {widgets.aktivitasMahasiswa && (
                    <div className="widget-wrapper grid-aktivitas-col3">
                      <AktivitasMahasiswa />
                    </div>
                  )}
                </div>

                {/* Bottom Row - Mini */}
                <div className="grid-bottom-row">
                  {/* Statistik Pengenalan */}
                  {widgets.statistikPengenalan && (
                    <div className="widget-wrapper grid-statistik-bottom">
                      <StatistikPengenalan />
                    </div>
                  )}

                  {/* Transkrip Suara */}
                  {widgets.transkripSuara && (
                    <div className="widget-wrapper grid-transkrip-bottom">
                      <TranskripSuara />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==================== MODE DISKUSI ==================== */}
            {activeMode === "diskusi" && (
              <>
                {/* Transkrip Suara - Top Left (PRIORITY) */}
                {widgets.transkripSuara && (
                  <div className="widget-wrapper grid-transkrip">
                    <TranskripSuara />
                  </div>
                )}

                {/* Ekspresi Suara - Top Right */}
                {widgets.ekspresiSuara && (
                  <div className="widget-wrapper grid-ekspresi-suara">
                    <EkspresiSuara />
                  </div>
                )}

                {/* Statistik Pengenalan - Middle Left */}
                {widgets.statistikPengenalan && (
                  <div className="widget-wrapper grid-statistik">
                    <StatistikPengenalan />
                  </div>
                )}

                {/* Ekspresi Wajah - Middle Right */}
                {widgets.ekspresiWajah && (
                  <div className="widget-wrapper grid-ekspresi-wajah">
                    <EkspresiWajah />
                  </div>
                )}

                {/* Bottom Row - 3 columns */}
                <div className="grid-bottom-row">
                  {/* Klasifikasi Gerakan */}
                  {widgets.klasifikasiGerakan && (
                    <div className="widget-wrapper grid-klasifikasi">
                      <KlasifikasiGerakan />
                    </div>
                  )}

                  {/* Posisi Kursi Denah */}
                  {widgets.posisiKursi && (
                    <div className="widget-wrapper grid-posisi">
                      <PosisiKursi mode="denah" classroomId={selectedClass} />
                    </div>
                  )}

                  {/* Aktivitas Mahasiswa */}
                  {widgets.aktivitasMahasiswa && (
                    <div className="widget-wrapper grid-aktivitas">
                      <AktivitasMahasiswa />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==================== MODE PRESENTASI ==================== */}
            {activeMode === "presentasi" && (
              <>
                {/* Left Main - Transkrip + Statistik */}
                <div className="grid-left-main">
                  {/* Transkrip Suara (PRIORITY) */}
                  {widgets.transkripSuara && (
                    <div className="widget-wrapper grid-transkrip">
                      <TranskripSuara />
                    </div>
                  )}

                  {/* Statistik Pengenalan - Below Transkrip */}
                  {widgets.statistikPengenalan && (
                    <div className="widget-wrapper grid-statistik">
                      <StatistikPengenalan />
                    </div>
                  )}
                </div>

                {/* Right Sidebar */}
                <div className="grid-right-sidebar">
                  {/* Klasifikasi Gerakan - Presenter Gesture */}
                  {widgets.klasifikasiGerakan && (
                    <div className="widget-wrapper grid-klasifikasi">
                      <KlasifikasiGerakan />
                    </div>
                  )}

                  {/* Ekspresi Suara - Di bawah Klasifikasi */}
                  {widgets.ekspresiSuara && (
                    <div className="widget-wrapper grid-ekspresi-suara">
                      <EkspresiSuara />
                    </div>
                  )}

                  {/* Mini Row - Aktivitas + Ekspresi Wajah (Compact) */}
                  <div className="grid-mini-row">
                    {widgets.aktivitasMahasiswa && (
                      <div className="widget-wrapper grid-aktivitas-mini">
                        <AktivitasMahasiswa />
                      </div>
                    )}

                    {widgets.ekspresiWajah && (
                      <div className="widget-wrapper grid-ekspresi-wajah-mini">
                        <EkspresiWajah />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ==================== MODE BRAINSTORMING ==================== */}
            {activeMode === "brainstorming" && (
              <>
                {/* Left Column - Transkrip + Bottom Row */}
                <div className="grid-left-column">
                  {/* Transkrip Suara (PRIORITY) */}
                  {widgets.transkripSuara && (
                    <div className="widget-wrapper grid-transkrip">
                      <TranskripSuara />
                    </div>
                  )}

                  {/* Bottom Row - Posisi Kursi + Ekspresi Suara */}
                  <div className="grid-left-bottom-row">
                    {/* Posisi Kursi - Denah (PRIORITY) */}
                    {widgets.posisiKursi && (
                      <div className="widget-wrapper grid-posisi">
                        <PosisiKursi mode="denah" classroomId={selectedClass} />
                      </div>
                    )}

                    {/* Ekspresi Suara - Antusiasme (PRIORITY) */}
                    {widgets.ekspresiSuara && (
                      <div className="widget-wrapper grid-ekspresi-suara-left">
                        <EkspresiSuara />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Sidebar */}
                <div className="grid-right-sidebar">
                  {/* Statistik Pengenalan (PRIORITY) */}
                  {widgets.statistikPengenalan && (
                    <div className="widget-wrapper grid-statistik">
                      <StatistikPengenalan />
                    </div>
                  )}

                  {/* Klasifikasi Gerakan */}
                  {widgets.klasifikasiGerakan && (
                    <div className="widget-wrapper grid-klasifikasi">
                      <KlasifikasiGerakan />
                    </div>
                  )}

                  {/* Bottom Row - 2 Visual Widgets (Larger) */}
                  <div className="grid-right-bottom-row">
                    {widgets.ekspresiWajah && (
                      <div className="widget-wrapper grid-ekspresi-wajah">
                        <EkspresiWajah />
                      </div>
                    )}

                    {widgets.aktivitasMahasiswa && (
                      <div className="widget-wrapper grid-aktivitas">
                        <AktivitasMahasiswa />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ==================== MODE BELAJAR ==================== */}
            {activeMode === "belajar" && (
              <>
                {/* Left Column - 2 Rows */}
                <div className="belajar-left-column">
                  {/* Top Row - Aktivitas + Ekspresi Wajah (PRIORITY) */}
                  <div className="belajar-top-row">
                    {widgets.aktivitasMahasiswa && (
                      <div className="widget-wrapper belajar-grid-aktivitas">
                        <AktivitasMahasiswa />
                      </div>
                    )}

                    {widgets.ekspresiWajah && (
                      <div className="widget-wrapper belajar-grid-wajah">
                        <EkspresiWajah />
                      </div>
                    )}
                  </div>

                  {/* Bottom Row - Polling + Posisi Denah */}
                  <div className="belajar-left-bottom-row">
                    {widgets.hasilPolling && (
                      <div className="widget-wrapper belajar-grid-polling-left">
                        <HasilPolling />
                      </div>
                    )}

                    {widgets.posisiKursi && (
                      <div className="widget-wrapper belajar-grid-posisi-denah">
                        <PosisiKursi mode="denah" classroomId={selectedClass} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="belajar-right-column">
                  {/* Transkrip Suara (MENENGAH) */}
                  {widgets.transkripSuara && (
                    <div className="widget-wrapper belajar-grid-transkrip">
                      <TranskripSuara />
                    </div>
                  )}

                  {/* Middle Row - Ekspresi Suara + Klasifikasi Gerakan (MENENGAH) */}
                  <div className="belajar-middle-row">
                    {widgets.ekspresiSuara && (
                      <div className="widget-wrapper belajar-grid-ekspresi">
                        <EkspresiSuara />
                      </div>
                    )}

                    {widgets.klasifikasiGerakan && (
                      <div className="widget-wrapper belajar-grid-klasifikasi">
                        <KlasifikasiGerakan />
                      </div>
                    )}
                  </div>

                  {/* Statistik Pengenalan (RENDAH) */}
                  {widgets.statistikPengenalan && (
                    <div className="widget-wrapper belajar-grid-statistik">
                      <StatistikPengenalan />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
