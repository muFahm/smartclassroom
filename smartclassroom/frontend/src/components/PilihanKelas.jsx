import React, { useState } from "react";
import "./PilihanKelas.css";

export default function PilihanKelas({ selectedClass, setSelectedClass }) {
  const [isOpen, setIsOpen] = useState(false);

  const kelasOptions = ["701", "702", "703"];

  const handleSelect = (kelas) => {
    setSelectedClass(kelas);
    setIsOpen(false);
  };

  return (
    <div className="pilihan-kelas-card">
      <h3 className="pilihan-kelas-title">Pilihan Kelas</h3>

      <div className="dropdown-container">
        <button className="dropdown-button" onClick={() => setIsOpen(!isOpen)}>
          <span className="dropdown-selected">Kelas {selectedClass}</span>
          <svg
            className={`dropdown-icon ${isOpen ? "open" : ""}`}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="dropdown-menu">
            {kelasOptions.map((kelas) => (
              <div
                key={kelas}
                className={`dropdown-item ${
                  selectedClass === kelas ? "active" : ""
                }`}
                onClick={() => handleSelect(kelas)}
              >
                Kelas {kelas}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
