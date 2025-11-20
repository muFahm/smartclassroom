import React from "react";
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
import Footer from "./components/Footer";
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="dashboard-container">
        <div className="dashboard-grid">

          {/* ====================================== */}
          {/* KOLOM KIRI (Kelas, Jam, Widget)        */}
          {/* ====================================== */}
          <div className="dashboard-left-column">
            <PilihanKelas />
            <DateTimeCard />
            <Widget />
          </div>

          {/* ====================================== */}
          {/* KOLOM KANAN (Konten Utama)             */}
          {/* ====================================== */}
          <div className="dashboard-right-column">

            {/* -------------------------------------- */}
            {/* TOP ROW: Suhu, Cahaya, Posisi Kursi + 4 Chart */}
            {/* -------------------------------------- */}
            <div className="dashboard-top-row">
              {/* Suhu & Cahaya (kolom kecil kiri) */}
              <div className="left-cards-container">
                <div className="suhu-slot">
                  <Suhu />
                </div>
                <div className="cahaya-slot">
                  <Cahaya />
                </div>
              </div>

              {/* Posisi Kursi */}
              <div className="posisi-slot">
                <PosisiKursi />
              </div>

              {/* Grid 4 Chart */}
              <div className="charts-grid-slot">
                <div className="chart-card-wrapper">
                  <EkspresiSuara />
                </div>
                <div className="chart-card-wrapper">
                  <EkspresiWajah />
                </div>
                <div className="chart-card-wrapper">
                  <KlasifikasiGerakan />
                </div>
                <div className="chart-card-wrapper">
                  <AktivitasMahasiswa />
                </div>
              </div>
            </div>

            {/* -------------------------------------- */}
            {/* MID ROW: Hasil Polling + Transkrip Suara */}
            {/* -------------------------------------- */}
            <div className="dashboard-middle-row">
              <HasilPolling />
              <TranskripSuara />
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
