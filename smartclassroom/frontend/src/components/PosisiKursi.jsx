import React from "react";
import "./PosisiKursi.css";
import { CHAIR_DATA } from "../utils/mockData";
import { getClassroomConfig } from "../utils/classroomLayouts";

export default function PosisiKursi({
  mode = "sidebar",
  showStats = false,
  classroomId = "701",
}) {
  // Get classroom configuration and occupancy data
  const classroomConfig = getClassroomConfig(classroomId);
  const chairData = CHAIR_DATA[classroomId];

  // Fallback if classroom not found
  if (!classroomConfig || !chairData) {
    return (
      <div className="posisi-kursi-card error">
        <p>Classroom {classroomId} not found</p>
      </div>
    );
  }

  const { layout, type } = classroomConfig;
  const { occupied, total, occupancy } = chairData;

  // Mode Sidebar: Tampilan compact
  if (mode === "sidebar") {
    return (
      <div className="posisi-kursi-card compact">
        <div className="posisi-kursi-header">
          <h3 className="posisi-kursi-title">Posisi Kursi</h3>
        </div>

        <div className="kursi-content">
          <div className="kursi-display-box">
            <span className="kursi-count">
              Kursi Terisi : {occupied} / {total}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Mode Denah: Tampilan visual grid bangku
  return (
    <div className={`posisi-kursi-card denah layout-${type}`}>
      <div className="posisi-kursi-header">
        <h3 className="posisi-kursi-title">Posisi Kursi</h3>
      </div>

      <div className="kursi-content">
        {/* Visual Grid Bangku */}
        <div className="kursi-grid">
          {layout.map((row, rowIndex) => (
            <div key={rowIndex} className="kursi-row">
              {row.map((seatNumber, seatIndex) => {
                // null = empty space (no seat)
                if (seatNumber === null) {
                  return (
                    <div
                      key={`${rowIndex}-${seatIndex}`}
                      className="kursi-empty-space"
                    ></div>
                  );
                }

                // Get occupancy status (1 = occupied, 0 = empty)
                const isOccupied = occupancy[seatNumber] === 1;

                return (
                  <div
                    key={`${rowIndex}-${seatIndex}`}
                    className={`kursi-seat ${
                      isOccupied ? "occupied" : "empty"
                    }`}
                    title={`Kursi ${seatNumber}: ${
                      isOccupied ? "Terisi" : "Kosong"
                    }`}
                  >
                    <div className="seat-number">{seatNumber}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend / Count Statistics */}
        {showStats ? (
          // Mode Kolaborasi: Count Statistics dengan angka
          <div className="kursi-stats">
            <div className="kursi-stat-item">
              <div className="legend-dot occupied"></div>
              <span>
                Terisi: <span className="kursi-stat-count">{occupied}</span>
              </span>
            </div>
            <div className="kursi-stat-item">
              <div className="legend-dot empty"></div>
              <span>
                Kosong:{" "}
                <span className="kursi-stat-count">{total - occupied}</span>
              </span>
            </div>
          </div>
        ) : (
          // Mode Lain: Legend Traditional tanpa angka
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
        )}
      </div>
    </div>
  );
}
