import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
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

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Default Route - Redirect to dashboard or login */}
        <Route
          path="/"
          element={
            localStorage.getItem("token") ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 - Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
