import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "./Mahasiswa.css";

export default function Mahasiswa() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Get user data from sessionStorage
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      setUserData(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <div className="mahasiswa-container">
      <Navbar 
        onLogout={handleLogout}
        userData={userData}
      />
      
      <main className="mahasiswa-main">
        <div className="mahasiswa-content">
          <div className="welcome-section">
            <h1>Selamat Datang, {userData?.full_name || "Mahasiswa"}</h1>
            <p className="welcome-subtitle">
              Portal Mahasiswa - Smart Classroom
            </p>
          </div>

          <div className="placeholder-section">
            <div className="placeholder-card">
              <div className="placeholder-icon">📱</div>
              <h2>Fitur Polling Device</h2>
              <p>
                Fitur polling device sedang dalam pengembangan. 
                Anda akan dapat mengikuti polling interaktif dari dosen 
                menggunakan perangkat polling di kelas.
              </p>
            </div>

            <div className="placeholder-card">
              <div className="placeholder-icon">📊</div>
              <h2>Riwayat Polling</h2>
              <p>
                Lihat riwayat jawaban polling dan statistik partisipasi 
                Anda di berbagai mata kuliah.
              </p>
            </div>

            <div className="placeholder-card">
              <div className="placeholder-icon">📅</div>
              <h2>Jadwal Kelas</h2>
              <p>
                Lihat jadwal mata kuliah Anda hari ini dan sepanjang minggu.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
