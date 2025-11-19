import React, { useState, useEffect } from "react";
import "./DateTimeCard.css";
import { getCurrentDateTime } from "../utils/mockData";

export default function DateTimeCard() {
  const [dateTime, setDateTime] = useState(getCurrentDateTime());

  // Update waktu setiap detik
  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(getCurrentDateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="datetime-card">
      <div className="datetime-date">{dateTime.fullDate}</div>
      <div className="datetime-time">{dateTime.time}</div>
    </div>
  );
}
