import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchClassrooms = async () =>
    {
      setLoading(true);
      setError("");
      try {
        const response = await apiRequest("/api/classrooms/classrooms/");
        const data = await response.json();
        setClassrooms(data.results || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchClassrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Ruang Kelas</p>
          <h1>Daftar Ruang Kelas</h1>
        </div>
        <button className="secondary" onClick={fetchClassrooms} disabled={loading}>
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </header>

      <section className="card">
        <div className="section-header">
          <h2>Ruang Terdaftar</h2>
          <span className="pill">{classrooms.length} ruang</span>
        </div>
        {error && <p className="error">{error}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Lokasi</th>
              <th>Kapasitas</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {classrooms.map((room) => (
              <tr key={room.id}>
                <td>{room.code}</td>
                <td>{room.name}</td>
                <td>{room.location || "-"}</td>
                <td>{room.capacity}</td>
                <td>{room.is_active ? "Aktif" : "Nonaktif"}</td>
                <td>
                  <button className="secondary" onClick={() => navigate(`/dashboard/classrooms/${room.id}`)}>
                    Detail
                  </button>
                </td>
              </tr>
            ))}
            {!loading && classrooms.length === 0 && (
              <tr>
                <td colSpan={6}>Belum ada data ruang kelas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
