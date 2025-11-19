import React from "react";
import Navbar from "./components/Navbar";
import PilihanKelas from "./components/PilihanKelas";
import Footer from './components/Footer';
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <div className="dashboard-container">
        <div className="dashboard-grid">
          {/* Dropdown Pilihan Kelas */}
          <PilihanKelas />
        </div>
      </div>

      <Footer />
    </>
  );
}