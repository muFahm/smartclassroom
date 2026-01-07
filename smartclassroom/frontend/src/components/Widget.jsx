import React from 'react';
import './Widget.css';

export default function Widget({ widgets, setWidgets, activeMode = 'default' }) {
  // ========================================
  // DEBUG - Bisa dihapus nanti
  // ========================================
  console.log('🔍 Widget Component - Active Mode:', activeMode);
  console.log('📋 Widgets State:', widgets);

  // ========================================
  // KONFIGURASI WIDGET PER MODE
  // ========================================
  
  const getAvailableWidgets = () => {
    const widgetConfigs = {
      default: [
        { key: 'posisiKursi', label: 'Posisi Kursi' },
        { key: 'hasilPolling', label: 'Hasil Polling' },
        { key: 'transkripSuara', label: 'Transkrip Suara' },
        { key: 'ekspresiSuara', label: 'Ekspresi Suara' },
        { key: 'ekspresiWajah', label: 'Ekspresi Wajah' },
        { key: 'klasifikasiGerakan', label: 'Klasifikasi Gerakan' },
        { key: 'aktivitasMahasiswa', label: 'Aktivitas Mahasiswa' },
        { key: 'statistikPengenalan', label: 'Statistik Pengenalan' },
      ],
      kuis: [
        { key: 'hasilPolling', label: 'Hasil Polling' },
        { key: 'klasifikasiGerakan', label: 'Klasifikasi Gerakan' },
        { key: 'transkripSuara', label: 'Transkrip Suara' },
        { key: 'statistikPengenalan', label: 'Statistik Pengenalan' },
        { key: 'ekspresiWajah', label: 'Ekspresi Wajah' },
        { key: 'ekspresiSuara', label: 'Ekspresi Suara' },
      ],
      diskusi: [
        { key: 'statistikPengenalan', label: 'Statistik Pengenalan' },
        { key: 'transkripSuara', label: 'Transkrip Suara' },
        { key: 'klasifikasiGerakan', label: 'Klasifikasi Gerakan' },
        { key: 'posisiKursi', label: 'Posisi Kursi' },
        { key: 'ekspresiSuara', label: 'Ekspresi Suara' },
        { key: 'ekspresiWajah', label: 'Ekspresi Wajah' },
        { key: 'aktivitasMahasiswa', label: 'Aktivitas Mahasiswa' },
      ],
    };

    return widgetConfigs[activeMode] || widgetConfigs.default;
  };

  // ========================================
  // GET MODE LABEL FOR BADGE
  // ========================================
  
  const getModeLabel = () => {
    const labels = {
      default: 'Dashboard Utama',
      kuis: 'Mode Kuis',
      diskusi: 'Mode Diskusi',
      kolaborasi: 'Mode Kolaborasi',
      presentasi: 'Mode Presentasi',
      brainstorming: 'Mode Brainstorming',
      belajar: 'Mode Belajar',
      praktikum: 'Mode Praktikum',
    };
    return labels[activeMode] || 'Dashboard';
  };

  // ========================================
  // HANDLERS
  // ========================================
  
  const handleCheckboxChange = (name) => {
    setWidgets(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const availableWidgets = getAvailableWidgets();

  const handleTampilkanSemua = () => {
    // Check hanya widget yang available di mode ini
    const availableKeys = availableWidgets.map(w => w.key);
    const allAvailableChecked = availableKeys.every(key => widgets[key] === true);
    const newValue = !allAvailableChecked;
    
    // Update hanya widget yang available di mode aktif
    const updates = {};
    availableKeys.forEach(key => {
      updates[key] = newValue;
    });
    
    setWidgets(prev => ({
      ...prev,
      ...updates
    }));
  };
  
  // Check apakah semua widget yang available sudah checked
  const availableKeys = availableWidgets.map(w => w.key);
  const allAvailableChecked = availableKeys.every(key => widgets[key] === true);

  // DEBUG - log available widgets
  console.log('📦 Available Widgets:', availableWidgets.map(w => w.label));

  // ========================================
  // RENDER
  // ========================================
  
  return (
    <div className="widget-card">
      {/* Header with Mode Badge */}
      <div className="widget-header">
        <h3 className="widget-title">Widget</h3>
        <span className="widget-mode-badge">{getModeLabel()}</span>
      </div>
      
      <div className="widget-list">
        {/* Tampilkan Semua - Toggle All Available Widgets */}
        <label className="widget-item">
          <input
            type="checkbox"
            checked={allAvailableChecked}
            onChange={handleTampilkanSemua}
          />
          <span>Tampilkan Semua</span>
        </label>

        {/* Render HANYA widget yang available di mode ini */}
        {availableWidgets.map(({ key, label }) => (
          <label key={key} className="widget-item">
            <input
              type="checkbox"
              checked={widgets[key] || false}
              onChange={() => handleCheckboxChange(key)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}