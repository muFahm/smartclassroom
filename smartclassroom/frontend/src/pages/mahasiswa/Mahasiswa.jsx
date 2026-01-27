import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import PollingDevice from "../../components/polling/PollingDevice";
import LivePolling from "../../components/polling/LivePolling";
import { getAssignedDevice } from "../../services/pollingDeviceService";
import "./Mahasiswa.css";

export default function Mahasiswa() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [assignedDevice, setAssignedDevice] = useState(null);
  const [activeTab, setActiveTab] = useState("polling");

  useEffect(() => {
    // Get user data from sessionStorage
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserData(user);
      
      // Get assigned device for this user
      if (user.nim) {
        const device = getAssignedDevice(user.nim);
        setAssignedDevice(device);
      }
    }
  }, []);

  const handleDeviceChange = (device) => {
    setAssignedDevice(device);
  };

  const handleAnswerSubmit = (answerData) => {
    console.log("Answer submitted:", answerData);
    // Handle answer submission - send to backend/MQTT
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  // Get NIM from user data or email
  const getNim = () => {
    if (userData?.nim) return userData.nim;
    if (userData?.email) {
      const match = userData.email.match(/^(\d{12})@/);
      if (match) return match[1];
    }
    return null;
  };

  const nim = getNim();

  return (
    <div className="mahasiswa-container">
      <Navbar 
        onLogout={handleLogout}
        userData={userData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <main className="mahasiswa-main">
        <div className="mahasiswa-content">
          {/* Polling Tab Content */}
          {activeTab === "polling" && (
            <div className="polling-section">
              <div className="polling-grid">
                {/* Device Assignment Card */}
                <PollingDevice 
                  nim={nim} 
                  onDeviceChange={handleDeviceChange} 
                />

                {/* Live Polling Card */}
                <LivePolling 
                  deviceCode={assignedDevice?.code}
                  nim={nim}
                  onAnswerSubmit={handleAnswerSubmit}
                />
              </div>

              {/* Quick Stats */}
              <div className="quick-stats">
                <div className="stat-card">
                  <div className="stat-icon completed">
                    <iconify-icon icon="mdi:check-circle" width="24" height="24"></iconify-icon>
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Kuis Selesai</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon answers">
                    <iconify-icon icon="mdi:message-reply" width="24" height="24"></iconify-icon>
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">0</span>
                    <span className="stat-label">Total Jawaban</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon accuracy">
                    <iconify-icon icon="mdi:target" width="24" height="24"></iconify-icon>
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">--%</span>
                    <span className="stat-label">Akurasi</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab Content */}
          {activeTab === "history" && (
            <div className="history-section">
              <div className="placeholder-card">
                <div className="placeholder-icon">📊</div>
                <h2>Riwayat Polling</h2>
                <p>
                  Lihat riwayat jawaban polling dan statistik partisipasi 
                  Anda di berbagai mata kuliah.
                </p>
              </div>
            </div>
          )}

          {/* Schedule Tab Content */}
          {activeTab === "schedule" && (
            <div className="schedule-section">
              <div className="placeholder-card">
                <div className="placeholder-icon">📅</div>
                <h2>Jadwal Kelas</h2>
                <p>
                  Lihat jadwal mata kuliah Anda hari ini dan sepanjang minggu.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
