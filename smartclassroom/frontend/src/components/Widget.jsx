import React, { useState } from 'react';
import './Widget.css';

export default function Widget() {
  const [widgets, setWidgets] = useState({
    tampilkanSemua: false,
    suhu: false,
    cahaya: false,
    posisiKursi: false,
    hasilPolling: false,
    transkripSuara: false,
    ekspresiSuara: false,
    ekspresiWajah: false,
    klasifikasiGerakan: false,
    aktivitasMahasiswa: false,
    statistikSuara: false,
    statistikWajah: false,
  });

  const handleCheckboxChange = (name) => {
    setWidgets(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleTampilkanSemua = () => {
    const newValue = !widgets.tampilkanSemua;
    setWidgets({
      tampilkanSemua: newValue,
      suhu: newValue,
      cahaya: newValue,
      posisiKursi: newValue,
      hasilPolling: newValue,
      transkripSuara: newValue,
      ekspresiSuara: newValue,
      ekspresiWajah: newValue,
      klasifikasiGerakan: newValue,
      aktivitasMahasiswa: newValue,
      statistikSuara: newValue,
      statistikWajah: newValue,
    });
  };

  return (
    <div className="widget-card">
      <h3 className="widget-title">Widget</h3>
      
      <div className="widget-list">
        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.tampilkanSemua}
            onChange={handleTampilkanSemua}
          />
          <span>Tampilkan Semua</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.suhu}
            onChange={() => handleCheckboxChange('suhu')}
          />
          <span>Suhu</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.cahaya}
            onChange={() => handleCheckboxChange('cahaya')}
          />
          <span>Cahaya</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.posisiKursi}
            onChange={() => handleCheckboxChange('posisiKursi')}
          />
          <span>Posisi Kursi</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.hasilPolling}
            onChange={() => handleCheckboxChange('hasilPolling')}
          />
          <span>Hasil Polling</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.transkripSuara}
            onChange={() => handleCheckboxChange('transkripSuara')}
          />
          <span>Transkrip Suara</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.ekspresiSuara}
            onChange={() => handleCheckboxChange('ekspresiSuara')}
          />
          <span>Ekspresi Suara</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.ekspresiWajah}
            onChange={() => handleCheckboxChange('ekspresiWajah')}
          />
          <span>Ekspresi Wajah</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.klasifikasiGerakan}
            onChange={() => handleCheckboxChange('klasifikasiGerakan')}
          />
          <span>Klasifikasi Gerakan</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.aktivitasMahasiswa}
            onChange={() => handleCheckboxChange('aktivitasMahasiswa')}
          />
          <span>Aktivitas Mahasiswa</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.statistikSuara}
            onChange={() => handleCheckboxChange('statistikSuara')}
          />
          <span>Statistik Pengenalan Suara</span>
        </label>

        <label className="widget-item">
          <input
            type="checkbox"
            checked={widgets.statistikWajah}
            onChange={() => handleCheckboxChange('statistikWajah')}
          />
          <span>Statistik Pengenalan Wajah</span>
        </label>
      </div>
    </div>
  );
}