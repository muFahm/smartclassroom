import React from 'react';
import './TranskripSuara.css';
import { TRANSCRIPT_DATA } from '../utils/mockData';

export default function TranskripSuara() {
  // Ambil 4 data pertama untuk tampilan
  const displayData = TRANSCRIPT_DATA.slice(0, 4);

  return (
    <div className="transkrip-suara-card">
      <div className="transkrip-suara-header">
        <h3 className="transkrip-suara-title">Transkrip Suara</h3>
        <button className="toggle-button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4C10 4 4 8.5 4 12C4 14.2091 5.79086 16 8 16H12C14.2091 16 16 14.2091 16 12C16 8.5 10 4 10 4Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
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
