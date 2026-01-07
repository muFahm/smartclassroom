import React from "react";
import "./SoalKuis.css";

export default function SoalKuis({ soal }) {
  return (
    <div className="soal-kuis-card">
      <div className="soal-header">
        <h3 className="soal-title">Soal {soal.nomor} :</h3>
      </div>
      
      <div className="soal-content">
        <p className="soal-pertanyaan">{soal.pertanyaan}</p>
        
        <div className="soal-pilihan">
          {soal.pilihan.map((pilihan, index) => (
            <div key={index} className="pilihan-item">
              <span className="pilihan-label">{pilihan.label}.</span>
              <span className="pilihan-text">{pilihan.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
