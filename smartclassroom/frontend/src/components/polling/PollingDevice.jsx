import React, { useState, useEffect } from "react";
import {
  getAssignedDevice,
  assignDevice,
  resetDevice,
  isValidDeviceCode,
  startDeviceSimulation,
  stopDeviceSimulation,
} from "../../services/pollingDeviceService";
import "./PollingDevice.css";

export default function PollingDevice({ nim, onDeviceChange }) {
  const [device, setDevice] = useState(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);

  // Load assigned device on mount
  useEffect(() => {
    if (nim) {
      const assigned = getAssignedDevice(nim);
      setDevice(assigned);
      
      // Start device simulation if assigned
      if (assigned) {
        const cleanup = startDeviceSimulation(assigned.code, (status) => {
          setDeviceStatus(status);
        });
        return cleanup;
      }
    }
  }, [nim]);

  // Clean up simulation on unmount
  useEffect(() => {
    return () => {
      stopDeviceSimulation();
    };
  }, []);

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 4) {
      setDeviceCode(value);
      setError("");
    }
  };

  const handleAssign = async () => {
    setError("");
    setSuccess("");

    if (!isValidDeviceCode(deviceCode)) {
      setError("Kode device harus 4 karakter (huruf besar dan angka)");
      return;
    }

    setLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = assignDevice(nim, deviceCode);

    if (result.success) {
      setDevice(result.device);
      setDeviceCode("");
      setSuccess("Device berhasil terdaftar!");
      onDeviceChange?.(result.device);

      // Start simulation for new device
      startDeviceSimulation(result.device.code, (status) => {
        setDeviceStatus(status);
      });

      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleReset = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = resetDevice(nim);

    if (result.success) {
      setDevice(null);
      setDeviceStatus(null);
      setShowResetConfirm(false);
      setSuccess("Device berhasil di-reset!");
      onDeviceChange?.(null);
      stopDeviceSimulation();

      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="polling-device-card">
      <div className="polling-device-header">
        <div className="polling-device-icon">
          <iconify-icon icon="gg:desktop" width="32" height="32"></iconify-icon>
        </div>
        <div className="polling-device-title">
          <h3>Polling Device</h3>
          <p>ESP32 Tactile Button Controller</p>
        </div>
        {device && (
          <div className={`device-status-badge ${deviceStatus?.status || "offline"}`}>
            <span className="status-dot"></span>
            {deviceStatus?.status === "online" ? "Online" : "Offline"}
          </div>
        )}
      </div>

      {error && (
        <div className="polling-device-error">
          <iconify-icon icon="mdi:alert-circle" width="18" height="18"></iconify-icon>
          {error}
        </div>
      )}

      {success && (
        <div className="polling-device-success">
          <iconify-icon icon="mdi:check-circle" width="18" height="18"></iconify-icon>
          {success}
        </div>
      )}

      {!device ? (
        // Device Assignment Form
        <div className="device-assignment-form">
          <div className="form-description">
            <iconify-icon icon="mdi:information-outline" width="20" height="20"></iconify-icon>
            <p>
              Daftarkan kode polling device Anda untuk dapat mengikuti kuis interaktif.
              Kode terdapat pada label device ESP32 Anda.
            </p>
          </div>

          <div className="device-code-input-group">
            <label>Kode Device</label>
            <div className="device-code-input-wrapper">
              <input
                type="text"
                value={deviceCode}
                onChange={handleCodeChange}
                placeholder="Contoh: A1B2"
                maxLength={4}
                disabled={loading}
                className="device-code-input"
              />
              <span className="code-counter">{deviceCode.length}/4</span>
            </div>
            <span className="input-hint">4 karakter huruf besar dan angka</span>
          </div>

          <button
            className="btn-assign-device"
            onClick={handleAssign}
            disabled={loading || deviceCode.length !== 4}
          >
            {loading ? (
              <>
                <iconify-icon icon="mdi:loading" width="20" height="20" className="spinning"></iconify-icon>
                Mendaftarkan...
              </>
            ) : (
              <>
                <iconify-icon icon="mdi:link-plus" width="20" height="20"></iconify-icon>
                Daftarkan Device
              </>
            )}
          </button>
        </div>
      ) : (
        // Device Info Display
        <div className="device-info-section">
          <div className="device-code-display">
            <span className="code-label">Kode Device Anda</span>
            <div className="code-value">
              {device.code.split("").map((char, i) => (
                <span key={i} className="code-char">{char}</span>
              ))}
            </div>
          </div>

          <div className="device-details">
            <div className="detail-item">
              <iconify-icon icon="mdi:calendar-check" width="18" height="18"></iconify-icon>
              <div>
                <span className="detail-label">Terdaftar</span>
                <span className="detail-value">{formatDate(device.assignedAt)}</span>
              </div>
            </div>

            {deviceStatus && (
              <>
                <div className="detail-item">
                  <iconify-icon icon="mdi:battery" width="18" height="18"></iconify-icon>
                  <div>
                    <span className="detail-label">Baterai</span>
                    <span className="detail-value">
                      <span className={`battery-level ${deviceStatus.batteryLevel > 20 ? "good" : "low"}`}>
                        {deviceStatus.batteryLevel}%
                      </span>
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <iconify-icon icon="mdi:wifi" width="18" height="18"></iconify-icon>
                  <div>
                    <span className="detail-label">Sinyal</span>
                    <span className="detail-value">{deviceStatus.signalStrength}%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {showResetConfirm ? (
            <div className="reset-confirm-section">
              <p className="reset-warning">
                <iconify-icon icon="mdi:alert" width="18" height="18"></iconify-icon>
                Yakin ingin reset device? Anda perlu mendaftarkan ulang untuk menggunakan polling.
              </p>
              <div className="reset-buttons">
                <button
                  className="btn-cancel-reset"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  className="btn-confirm-reset"
                  onClick={handleReset}
                  disabled={loading}
                >
                  {loading ? "Mereset..." : "Ya, Reset"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn-reset-device"
              onClick={() => setShowResetConfirm(true)}
            >
              <iconify-icon icon="mdi:link-off" width="18" height="18"></iconify-icon>
              Reset Device
            </button>
          )}
        </div>
      )}
    </div>
  );
}
