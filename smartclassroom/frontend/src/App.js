import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardHome from "./pages/dashboard/DashboardHome";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import QuizPackagesPage from "./pages/dashboard/QuizPackagesPage";
import PackageDetailPage from "./pages/dashboard/PackageDetailPage";
import Mahasiswa from "./pages/mahasiswa/Mahasiswa";

// Root redirect component - handles role-based navigation
function RootRedirect() {
  const token = sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("userRole");
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect based on user role
  if (userRole === "mahasiswa") {
    return <Navigate to="/mahasiswa" replace />;
  }
  
  // Default to classoverview for dosen/admin
  return <Navigate to="/classoverview" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Mahasiswa route */}
        <Route
          path="/mahasiswa"
          element={
            <ProtectedRoute>
              <Mahasiswa />
            </ProtectedRoute>
          }
        />
        
        {/* Dosen/Admin routes */}
        <Route
          path="/classoverview"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route
            path=":classId"
            element={<Navigate to="dashboard" replace />}
          />
          <Route path=":classId/dashboard" element={<DashboardHome />} />
          <Route path=":classId/dashboard/kuis" element={<QuizPackagesPage />} />
          <Route
            path=":classId/dashboard/kuis/:packageId"
            element={<PackageDetailPage />}
          />
        </Route>
        <Route
          path="/"
          element={<RootRedirect />}
        />
        <Route
          path="/dashboard"
          element={<Navigate to="/classoverview" replace />}
        />
        <Route
          path="/dashboard/:classId/*"
          element={<Navigate to="/classoverview" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
