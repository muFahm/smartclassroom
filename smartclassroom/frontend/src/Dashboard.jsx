import React from "react";
import Navbar from "./components/Navbar";
import PilihanKelas from "./components/PilihanKelas";
import DateTimeCard from "./components/DateTimeCard";
import Widget from "./components/Widget";
import Footer from './components/Footer';
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="dashboard-container">
        <div className="dashboard-grid">
          {/* Kolom Kiri: Pilihan Kelas, DateTime & Widget */}
          <div className="dashboard-left-column">
            <PilihanKelas />
            <DateTimeCard />
            <Widget />
          </div>
          
          {/* Kolom Kanan: Konten Utama */}
          <div className="dashboard-right-column">
            {/* Konten dashboard utama bisa ditambahkan di sini */}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}