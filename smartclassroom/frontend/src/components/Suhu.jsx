import React, { useState, useEffect } from 'react';
import './Suhu.css';

export default function Suhu() {
  const [temperature, setTemperature] = useState(22);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTemp = Math.floor(Math.random() * (26 - 20 + 1)) + 20;
      setTemperature(newTemp);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="suhu-card">
      <h3 className="suhu-title">Suhu</h3>
      <div className="suhu-content">
        <svg 
          className="suhu-icon" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            d="M14 14.76V3.5C14 2.67 13.33 2 12.5 2C11.67 2 11 2.67 11 3.5V14.76C9.78 15.37 9 16.62 9 18C9 20.21 10.79 22 13 22C15.21 22 17 20.21 17 18C17 16.62 16.22 15.37 15 14.76H14ZM12.5 4C12.78 4 13 4.22 13 4.5V8H12V4.5C12 4.22 12.22 4 12.5 4Z" 
            fill="currentColor"
          />
        </svg>
        <div className="suhu-value">{temperature} °C</div>
      </div>
    </div>
  );
}