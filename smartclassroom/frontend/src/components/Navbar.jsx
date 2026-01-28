import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser } from "../utils/auth";
import { fetchStudentData, getStudentFromCache } from "../services/studentDataService";
import { fetchLecturerPhoto } from "../services/studentService";
import "./Navbar.css";

export default function Navbar({ 
  activeMode, 
  setActiveMode, 
  isOverview, 
  selectedClass,
  // Mahasiswa specific props
  activeTab,
  setActiveTab,
  userData
}) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const user = getUser() || userData;
  const userRole = sessionStorage.getItem("userRole");

  const modes = [
    { id: "default", label: "Dashboard Utama" },
    { id: "kuis", label: "Kuis" },
    { id: "diskusi", label: "Diskusi" },
    { id: "kolaborasi", label: "Kolaborasi" },
    { id: "presentasi", label: "Presentasi" },
    { id: "brainstorming", label: "Brainstorming" },
    { id: "belajar", label: "Belajar" },
  ];

  // Mahasiswa tabs
  const mahasiswaTabs = [
    { id: "polling", label: "Polling & Kuis", icon: "mdi:poll" },
    { id: "history", label: "Jadwal Kelas", icon: "mdi:calendar-clock" },
  ];

  // Fetch user photo based on role
  useEffect(() => {
    const loadPhoto = async () => {
      if (userRole === "mahasiswa") {
        // Get NIM from user data
        const nim = user?.nim || (user?.email?.match(/^(\d{12})@/)?.[1]);
        console.log("Loading photo for mahasiswa NIM:", nim);
        
        if (nim) {
          // Check cache first using the existing service
          const cached = getStudentFromCache(nim);
          if (cached?.photo) {
            console.log("Using cached photo from studentDataService");
            setUserPhoto(cached.photo);
            return;
          }

          // Fetch from API
          const studentData = await fetchStudentData(nim);
          console.log("Fetched student data:", studentData);
          if (studentData?.photo) {
            setUserPhoto(studentData.photo);
          }
        }
      } else if (userRole === "dosen") {
        // Get staff ID from user data
        const staffId = user?.staff_id || user?.staffId || user?.id;
        console.log("Loading photo for dosen staffId:", staffId);
        
        if (staffId) {
          const photo = await fetchLecturerPhoto(staffId);
          if (photo) {
            setUserPhoto(photo);
          }
        }
      }
    };

    if (user) {
      loadPhoto();
    }
  }, [userRole, user]);

  const handleLogout = () => {
    logout();
    sessionStorage.removeItem("userRole");
    navigate("/login");
  };

  // Get role label for display
  const getRoleLabel = () => {
    if (userRole === "mahasiswa") return "Mahasiswa";
    if (userRole === "dosen") return "Dosen";
    return "Admin Prodi";
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-logo">Smart Classroom</h1>
      </div>

      {/* Mode buttons for dosen/admin */}
      {!isOverview && userRole !== "mahasiswa" && (
        <div className="navbar-center">
          {modes.map((mode) => (
            <button
              key={mode.id}
              className={`navbar-link ${activeMode === mode.id ? "active" : ""}`}
              onClick={() => {
                setActiveMode(mode.id);
                navigate(`/classoverview/${selectedClass || "701"}/dashboard`);
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab navigation for mahasiswa */}
      {userRole === "mahasiswa" && setActiveTab && (
        <div className="navbar-center mahasiswa-nav-tabs">
          {mahasiswaTabs.map((tab) => (
            <button
              key={tab.id}
              className={`navbar-link mahasiswa-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <iconify-icon icon={tab.icon} width="18" height="18"></iconify-icon>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="navbar-right">
        <div
          className="navbar-user"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div className="navbar-user-avatar">
            {userPhoto ? (
              <img src={userPhoto} alt="Profile" className="avatar-photo" />
            ) : (
              <span>👤</span>
            )}
          </div>
          {showDropdown && (
            <div className="navbar-dropdown">
              <div className="navbar-dropdown-header">
                <p className="navbar-dropdown-name">
                  {user?.full_name || user?.username || "User"}
                </p>
                <p className="navbar-dropdown-role">{getRoleLabel()}</p>
              </div>
              <button className="navbar-dropdown-logout" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
