import React from "react";
import "./PosisiKursi.css";
import { CHAIR_DATA } from "../utils/mockData";

export default function PosisiKursi({ mode = "sidebar" }) {
  const { occupied, total, layout } = CHAIR_DATA;

  // Mode Sidebar: Tampilan compact
  if (mode === "sidebar") {
    return (
      <div className="posisi-kursi-card compact">
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
            <span className="kursi-count">
              Kursi : {occupied} / {total}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Mode Denah: Tampilan visual grid bangku
  return (
    <div className="posisi-kursi-card denah">
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
        {/* Visual Grid Bangku */}
        <div className="kursi-grid">
          {layout.map((row, rowIndex) => (
            <div key={rowIndex} className="kursi-row">
              {row.map((seat, seatIndex) => (
                <div
                  key={`${rowIndex}-${seatIndex}`}
                  className={`kursi-seat ${seat === 1 ? 'occupied' : 'empty'}`}
                  title={seat === 1 ? 'Terisi' : 'Kosong'}
                >
                  <div className="seat-dot"></div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="kursi-legend">
          <div className="legend-item">
            <div className="legend-dot occupied"></div>
            <span>Terisi</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot empty"></div>
            <span>Kosong</span>
          </div>
        </div>
      </div>
    </div>
  );
}
