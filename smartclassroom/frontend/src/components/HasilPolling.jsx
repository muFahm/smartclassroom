import React from "react";
import "./HasilPolling.css";
import { POLLING_DATA, POLLING_DATA_KUIS } from "../utils/mockData";

export default function HasilPolling({ mode = "default" }) {
  // Gunakan data berbeda untuk mode kuis
  const sourceData = mode === "kuis" ? POLLING_DATA_KUIS : POLLING_DATA;
  const displayData = mode === "kuis" ? sourceData : sourceData.slice(0, 3);

  return (
    <div className="hasil-polling-card">
      <div className="hasil-polling-header">
        <h3 className="hasil-polling-title">Hasil Polling</h3>
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
