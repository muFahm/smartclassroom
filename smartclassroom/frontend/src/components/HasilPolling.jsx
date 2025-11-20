import React from "react";
import "./HasilPolling.css";
import { POLLING_DATA } from "../utils/mockData";

export default function HasilPolling() {
  // Ambil 3 data pertama untuk tampilan
  const displayData = POLLING_DATA.slice(0, 3);

  return (
    <div className="hasil-polling-card">
      <div className="hasil-polling-header">
        <h3 className="hasil-polling-title">Hasil Polling</h3>
        <button className="toggle-button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4C10 4 4 8.5 4 12C4 14.2091 5.79086 16 8 16H12C14.2091 16 16 14.2091 16 12C16 8.5 10 4 10 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="polling-table-container">
        <table className="polling-table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Nama</th>
              <th>Jawaban</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((item, index) => (
              <tr key={index}>
                <td>{item.id}</td>
                <td>{item.nama}</td>
                <td>
                  <span
                    className={`jawaban-badge ${item.jawaban.toLowerCase()}`}
                  >
                    {item.jawaban}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
