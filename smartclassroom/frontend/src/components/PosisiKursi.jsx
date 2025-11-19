import React from 'react';
import './PosisiKursi.css';
import { CHAIR_DATA } from '../utils/mockData';

export default function PosisiKursi() {
  const { occupied, total } = CHAIR_DATA;

  return (
    <div className="posisi-kursi-card">
      <div className="posisi-kursi-header">
        <h3 className="posisi-kursi-title">Posisi Kursi</h3>
        <button className="eye-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      <div className="kursi-content">
        <div className="kursi-display-box">
          <span className="kursi-count">Kursi : {occupied} / {total}</span>
        </div>
      </div>
    </div>
  );
}