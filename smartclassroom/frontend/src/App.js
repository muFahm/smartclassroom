import React from "react";
import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import LoginPage from "./pages/auth/LoginPage";
import QuizPackagesPage from "./pages/dashboard/QuizPackagesPage";
import PackageDetailPage from "./pages/dashboard/PackageDetailPage";
import SessionsPage from "./pages/dashboard/SessionsPage";
import SessionDetailPage from "./pages/dashboard/SessionDetailPage";
import SessionReportPage from "./pages/dashboard/SessionReportPage";
import FaceEnrollmentPage from "./pages/dashboard/FaceEnrollmentPage";
import VoiceEnrollmentPage from "./pages/dashboard/VoiceEnrollmentPage";
import AttendanceSessionPage from "./pages/dashboard/AttendanceSessionPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="quizzes" replace />} />
            <Route path="quizzes" element={<QuizPackagesPage />} />
            <Route path="quizzes/:packageId" element={<PackageDetailPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
            <Route path="sessions/:sessionId/report" element={<SessionReportPage />} />
			<Route path="biometrics/face" element={<FaceEnrollmentPage />} />
      			<Route path="biometrics/voice" element={<VoiceEnrollmentPage />} />
      			<Route path="attendance" element={<AttendanceSessionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
