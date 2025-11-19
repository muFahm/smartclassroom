import React from "react";
import Dashboard from "./Dashboard";
import {
  POLLING_DATA,
  SENSOR_DATA,
  CHAIR_DATA,
  getCurrentDateTime,
} from "./utils/mockData";

export default function App() {
  // Test Mock Data - Buka Console (F12) untuk melihat data
  console.log("=== TESTING MOCK DATA ===");
  console.log("Polling Data:", POLLING_DATA);
  console.log("Sensor Data:", SENSOR_DATA);
  console.log("Chair Data:", CHAIR_DATA);
  console.log("Date Time:", getCurrentDateTime());
  console.log("========================");

  return <Dashboard />;
}
