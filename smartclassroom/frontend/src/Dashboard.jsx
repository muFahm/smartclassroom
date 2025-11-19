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
import Footer from "./components/Footer";
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="dashboard-container">
        <div className="dashboard-grid">
          {/* Kolom Kiri */}
          <div className="dashboard-left-column">
            <PilihanKelas />
            <DateTimeCard />
            <Widget />
          </div>

          {/* Kolom Kanan (konten utama) */}
          <div className="dashboard-right-column">
            {/* TOP ROW: grid 3 kolom, PosisiKursi dan EkspresiSuara span 2 rows */}
            <div className="dashboard-top-row">
              <div className="card-slot suhu-slot">
                <Suhu />
              </div>

              <div className="card-slot posisi-slot">
                <div className="right-seat-card">
                  <PosisiKursi />
                </div>
              </div>

              <div className="card-slot ekspresi-slot">
                <EkspresiSuara />
              </div>

              <div className="card-slot cahaya-slot">
                <Cahaya />
              </div>
            </div>

            {/* Hasil Polling */}
            <div className="dashboard-middle-row">
              <HasilPolling />
            </div>

            {/* Transkrip Suara - Full height sampai footer */}
            <div className="dashboard-middle-row" style={{ flex: 1 }}>
              <TranskripSuara />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}