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
import Footer from "./components/Footer";
import { KUIS_ACTIVE } from "./utils/mockData";
import "./Dashboard.css";

export default function Dashboard() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  // Mode aktif dashboard (default, kuis, diskusi, kolaborasi, presentasi, brainstorming, belajar, praktikum)
  const [activeMode, setActiveMode] = useState("default");

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

            {/* ✅ PASS activeMode ke Widget untuk context-aware filtering */}
            <Widget
              key={activeMode}
              widgets={widgets}
              setWidgets={setWidgets}
              activeMode={activeMode}
            />
          </div>

          {/* ========================================== */}
          {/* MAIN AREA (DINAMIS - Berubah sesuai mode) */}
          {/* ========================================== */}
          <div className={`dashboard-right-column ${getModeClass()}`}>
            {/* ==================== MODE DEFAULT ==================== */}
            {activeMode === "default" && (
              <>
                {/* Posisi Kursi (Visual Denah) */}
                {widgets.posisiKursi && (
                  <div className="widget-wrapper grid-posisi-denah">
                    <PosisiKursi mode="denah" />
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
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
