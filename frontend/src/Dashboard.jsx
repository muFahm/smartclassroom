import React from "react";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = async () => {
    await fetch("http://localhost:8000/api/accounts/logout/", {
      method: "POST",
    });
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  if (!user) return <p>Silakan login terlebih dahulu.</p>;

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Selamat datang, {user.username}</h2>
      <h4>Role: {user.role === "lecturer" ? "Dosen/Admin 👨‍🏫" : "Mahasiswa 👩‍🎓"}</h4>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
