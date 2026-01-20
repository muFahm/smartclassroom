import React from "react";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute Component
 * Protects routes that require authentication
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  // Check if user is authenticated
  if (!token || !user) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Authenticated, render the protected component
  return children;
}

export default ProtectedRoute;
