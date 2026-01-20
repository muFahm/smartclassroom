import React from "react";
import "./ClassroomOverview.css";

export default function ClassroomOverview({ onSelectClass }) {
  // Data ringkasan per kelas
  const classrooms = [
    {
      id: "701",
      name: "Kelas 701",
      capacity: 32,
      studentsActive: 28,
      temperature: 22,
      lightLevel: 85,
      status: "aktif"
    },
    {
      id: "702",
      name: "Kelas 702",
      capacity: 50,
      studentsActive: 45,
      temperature: 23,
      lightLevel: 78,
      status: "aktif"
    },
    {
      id: "703",
      name: "Kelas 703",
      capacity: 30,
      studentsActive: 26,
      temperature: 21,
      lightLevel: 92,
      status: "aktif"
    },
  ];

  // Hitung statistik agregat
  const totalCapacity = classrooms.reduce((sum, c) => sum + c.capacity, 0);
  const totalActive = classrooms.reduce((sum, c) => sum + c.studentsActive, 0);
  const avgTemperature = (classrooms.reduce((sum, c) => sum + c.temperature, 0) / classrooms.length).toFixed(1);
  const avgLight = (classrooms.reduce((sum, c) => sum + c.lightLevel, 0) / classrooms.length).toFixed(0);

  return (
    <div className="overview-container">
      {/* HEADER */}
      <div className="overview-header">
        <h2>Dashboard Overview</h2>
        <p>Pantau semua kelas dengan ringkasan real-time</p>
      </div>

      {/* STATISTIK AGREGAT */}
      <div className="overview-stats">
        <div className="stat-card">
          <div className="stat-icon students">👥</div>
          <div className="stat-content">
            <div className="stat-number">{totalActive}/{totalCapacity}</div>
            <div className="stat-label">Mahasiswa Aktif</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon temperature">🌡️</div>
          <div className="stat-content">
            <div className="stat-number">{avgTemperature}°C</div>
            <div className="stat-label">Rata-rata Suhu</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon light">💡</div>
          <div className="stat-content">
            <div className="stat-number">{avgLight}%</div>
            <div className="stat-label">Rata-rata Cahaya</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon classes">📚</div>
          <div className="stat-content">
            <div className="stat-number">{classrooms.length}</div>
            <div className="stat-label">Total Kelas</div>
          </div>
        </div>
      </div>

      {/* CLASSROOM CARDS */}
      <div className="overview-title">
        <h3>Rincian Per Kelas</h3>
      </div>

      <div className="classrooms-grid">
        {classrooms.map((classroom) => (
          <div
            key={classroom.id}
            className="classroom-card"
            onClick={() => onSelectClass(classroom.id)}
          >
            <div className="classroom-header">
              <div className="classroom-name">{classroom.name}</div>
              <div className={`classroom-status status-${classroom.status}`}>
                ● {classroom.status}
              </div>
            </div>

            <div className="classroom-body">
              <div className="info-row">
                <span className="info-icon">👥</span>
                <span className="info-label">Mahasiswa  :</span>
                <span className="info-value">
                  {classroom.studentsActive}/{classroom.capacity}
                </span>
              </div>

              <div className="info-row">
                <span className="info-icon">🌡️</span>
                <span className="info-label">Suhu   :</span>
                <span className="info-value">{classroom.temperature}°C</span>
              </div>

              <div className="info-row">
                <span className="info-icon">💡</span>
                <span className="info-label">Cahaya  :</span>
                <span className="info-value">{classroom.lightLevel}%</span>
              </div>
            </div>

            <div className="classroom-footer">
              <button className="btn-detail">Lihat Detail →</button>
            </div>
          </div>
        ))}
      </div>

      {/* TIPS */}
      <div className="overview-tips">
        <div className="tips-icon">💡</div>
        <div className="tips-content">
          <strong>Tips:</strong> Klik pada kartu kelas untuk melihat detail lengkap dan monitoring real-time per kelas.
        </div>
      </div>
    </div>
  );
}
