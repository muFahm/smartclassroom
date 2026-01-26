import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import ClassroomOverview from "../../components/ClassroomOverview";

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { setSelectedClass, setActiveMode } = useOutletContext();

  const handleSelectClass = (classId) => {
    setSelectedClass(classId);
    setActiveMode("default");
    navigate(`/classoverview/${classId}`, { replace: false });
  };

  return <ClassroomOverview onSelectClass={handleSelectClass} />;
}