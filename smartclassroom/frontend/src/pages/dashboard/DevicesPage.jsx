import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function DevicesPage() {
  const { user } = useAuth();
  const isLecturer = user?.role === "lecturer";

  const [claimCode, setClaimCode] = useState("");
  const [myDevices, setMyDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const normalizeList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload?.results && Array.isArray(payload.results)) return payload.results;
    return [];
  };

  const fetchMyDevices = async () => {
    const response = await apiRequest("/api/quiz/runtime/devices/my_devices/");
    const data = await response.json();
    setMyDevices(normalizeList(data));
  };

  const fetchAllDevices = async () => {
    if (!isLecturer) return;
    const response = await apiRequest("/api/quiz/runtime/devices/");
    const data = await response.json();
    setAllDevices(normalizeList(data));
  };

  const refresh = async () => {
    setError("");
    try {
      await Promise.all([fetchMyDevices(), fetchAllDevices()]);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLecturer]);

  const handleClaim = async (event) => {
    event.preventDefault();
    if (!claimCode.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/api/quiz/runtime/devices/claim/", {
        method: "POST",
        body: JSON.stringify({ code: claimCode.trim() }),
      });
      setMessage("Perangkat berhasil di-claim.");
      setClaimCode("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (deviceId) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/quiz/runtime/devices/${deviceId}/reset/`, { method: "POST" });
      setMessage("Perangkat telah di-reset dan dilepas.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDeviceTable = (devices, canReset) => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Kode</th>
          <th>Hardware UID</th>
          <th>Status</th>
          <th>Online</th>
          <th>Battery</th>
          <th>RSSI</th>
          <th>Terakhir Dilihat</th>
          <th>Assigned To</th>
          {canReset && <th>Aksi</th>}
        </tr>
      </thead>
      <tbody>
        {devices.map((device) => (
          <tr key={device.id}>
            <td>{device.code}</td>
            <td>{device.hardware_uid}</td>
            <td>{device.status}</td>
            <td>{device.is_online ? "Online" : "Offline"}</td>
            <td>{device.battery_level ? `${device.battery_level}%` : "-"}</td>
            <td>{device.last_rssi ?? "-"}</td>
            <td>{device.last_seen ? new Date(device.last_seen).toLocaleString() : "-"}</td>
            <td>{device.assigned_to_email || "-"}</td>
            {canReset && (
              <td>
                <button className="secondary" onClick={() => handleReset(device.id)} disabled={loading}>
                  Reset / Unassign
                </button>
              </td>
            )}
          </tr>
        ))}
        {devices.length === 0 && (
          <tr>
            <td colSpan={canReset ? 9 : 8}>Belum ada perangkat.</td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted">Polling Device</p>
          <h1>Manajemen Perangkat</h1>
        </div>
        <button className="secondary" onClick={refresh} disabled={loading}>
          Refresh
        </button>
      </header>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <section className="card">
        <h2>Claim Perangkat</h2>
        <form className="form grid two" onSubmit={handleClaim}>
          <label>
            Kode Unik Perangkat
            <input value={claimCode} onChange={(e) => setClaimCode(e.target.value)} placeholder="misal: DEV123" />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="submit" disabled={!claimCode.trim() || loading}>
              {loading ? "Memproses..." : "Claim"}
            </button>
          </div>
        </form>
        <p className="muted">Masukkan kode yang tercetak pada device untuk mengaitkan ke akun Anda.</p>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Device Saya</h2>
          <span className="pill">{myDevices.length} perangkat</span>
        </div>
        {renderDeviceTable(myDevices, true)}
      </section>

      {isLecturer && (
        <section className="card">
          <div className="section-header">
            <h2>Semua Device (Dosen/Admin)</h2>
            <span className="pill">{allDevices.length} perangkat</span>
          </div>
          {renderDeviceTable(allDevices, true)}
        </section>
      )}
    </div>
  );
}
