import React from "react";
import "./TranskripSuara.css";
import { TRANSCRIPT_DATA } from "../utils/mockData";

export default function TranskripSuara() {
  // Tampilkan semua data
  const displayData = TRANSCRIPT_DATA;

  return (
    <div className="transkrip-suara-card">
      <div className="transkrip-suara-header">
        <h3 className="transkrip-suara-title">Transkrip Suara</h3>
      </div>

      <div className="transkrip-content">
        {displayData.map((item, index) => (
          <div key={index} className="transkrip-item">
            <div className="transkrip-time">{item.time}</div>
            <div className="transkrip-text">
              <span className="transkrip-speaker">{item.speaker}</span>
              <span className="transkrip-separator">:</span>
              <span className="transkrip-message">{item.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
