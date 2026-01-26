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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/classoverview"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path=":classId" element={<DashboardHome />} />
          <Route path=":classId/kuis" element={<QuizPackagesPage />} />
          <Route path=":classId/kuis/:packageId" element={<PackageDetailPage />} />
        </Route>
        <Route
          path="/"
          element={
            localStorage.getItem("token") ? (
              <Navigate to="/classoverview" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
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
