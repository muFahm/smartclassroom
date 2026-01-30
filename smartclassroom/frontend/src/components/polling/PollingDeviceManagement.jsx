import React, { useEffect, useMemo, useState } from "react";
import pollingDevicesData from "../../data/polling_devices.json";
import {
  getAllDeviceAssignments,
  getDeviceHeartbeatSnapshot,
  initializeDeviceHeartbeatBridge,
  initPollingResponseBridge,
  resetDevice,
  subscribeDeviceActivity,
  subscribeDeviceHeartbeats,
} from "../../services/pollingDeviceService";
import {
  fetchMultipleStudents,
  getStudentFromCache,
  hasStudentPhoto,
} from "../../services/studentDataService";
import "./PollingDeviceManagement.css";

const getPhotoPlaceholder = (name = "User") =>
  `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(
    name,
  )}`;

const resolvePhotoSrc = (photo) => {
  if (!photo) return null;
  if (photo.startsWith("data:")) return photo;
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  return `data:image/jpeg;base64,${photo}`;
};

const buildInitials = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

export default function PollingDeviceManagement() {
  const [assignments, setAssignments] = useState({});
  const [studentData, setStudentData] = useState(new Map());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [resettingCode, setResettingCode] = useState(null);
  const [heartbeatMap, setHeartbeatMap] = useState(() => getDeviceHeartbeatSnapshot());
  const [activityMap, setActivityMap] = useState(new Map());

  const baseDevices = pollingDevicesData.devices || [];

  const devices = useMemo(() => {
    const map = new Map();
    baseDevices.forEach((device) => map.set(device.code, device));
    activityMap.forEach((_, code) => {
      if (!map.has(code)) {
        map.set(code, { code, name: "Device" });
      }
    });
    return Array.from(map.values());
  }, [baseDevices, activityMap]);

  const deviceToNimMap = useMemo(() => {
    const map = new Map();
    Object.entries(assignments).forEach(([nim, code]) => {
      if (code) map.set(code, nim);
    });
    return map;
  }, [assignments]);

  const activityNims = useMemo(() => {
    const list = [];
    activityMap.forEach((entry) => {
      if (entry?.nim) list.push(entry.nim);
    });
    return list;
  }, [activityMap]);

  const assignedNims = useMemo(() => Array.from(deviceToNimMap.values()), [deviceToNimMap]);
  const allNims = useMemo(() => {
    const set = new Set([...assignedNims, ...activityNims]);
    return Array.from(set);
  }, [assignedNims, activityNims]);

  useEffect(() => {
    setAssignments(getAllDeviceAssignments());

    const handleStorage = (event) => {
      if (event.key === "all_device_assignments") {
        setAssignments(getAllDeviceAssignments());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    initializeDeviceHeartbeatBridge();
    const unsubscribe = subscribeDeviceHeartbeats((snapshot) => {
      setHeartbeatMap(snapshot);
    });

    const pollingConnection = initPollingResponseBridge();
    const unsubscribeActivity = subscribeDeviceActivity((snapshot) => {
      setActivityMap(snapshot);
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeActivity) unsubscribeActivity();
      if (pollingConnection?.disconnect) pollingConnection.disconnect();
    };
  }, []);

  useEffect(() => {
    if (allNims.length === 0) {
      setStudentData(new Map());
      return;
    }

    const allCached = allNims.every((nim) => hasStudentPhoto(nim));
    if (allCached) {
      const cached = new Map();
      allNims.forEach((nim) => {
        const data = getStudentFromCache(nim);
        if (data) cached.set(nim, data);
      });
      setStudentData(cached);
      return;
    }

    setLoadingStudents(true);
    fetchMultipleStudents(allNims)
      .then((results) => {
        setStudentData(results);
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, [allNims]);

  const assignedCount = assignedNims.length;
  const onlineCount = useMemo(() => {
    let count = 0;
    devices.forEach((device) => {
      const status = heartbeatMap.get(device.code);
      const activity = activityMap.get(device.code);
      if (activity?.status === "online" || status?.status === "online") {
        count += 1;
      }
    });
    return count;
  }, [devices, heartbeatMap, activityMap]);

  const handleReset = (deviceCode) => {
    const nim = deviceToNimMap.get(deviceCode);
    if (!nim) return;

    const confirmed = window.confirm(
      `Reset device ${deviceCode} dari mahasiswa ${nim}?`,
    );
    if (!confirmed) return;

    setResettingCode(deviceCode);
    const result = resetDevice(nim);
    if (result.success) {
      setAssignments(getAllDeviceAssignments());
    }
    setResettingCode(null);
  };

  return (
    <div className="polling-device-management">
      <div className="polling-device-management__header">
        <div>
          <h2>Polling Devices</h2>
          <p>Monitor perangkat polling yang aktif dan assignment mahasiswa.</p>
        </div>
        <div className="polling-device-management__stats">
          <div className="stat-card">
            <span className="stat-label">Total Device</span>
            <span className="stat-value">{devices.length}</span>
          </div>
          <div className="stat-card online">
            <span className="stat-label">Aktif</span>
            <span className="stat-value">{onlineCount}</span>
          </div>
          <div className="stat-card assigned">
            <span className="stat-label">Ter-assign</span>
            <span className="stat-value">{assignedCount}</span>
          </div>
        </div>
      </div>

      <div className="polling-device-management__grid">
        {devices.map((device) => {
          const activity = activityMap.get(device.code);
          const nim = activity?.nim || deviceToNimMap.get(device.code);
          const student = nim ? studentData.get(nim) : null;
          const photoSrc = resolvePhotoSrc(student?.photo);
          const displayName = activity?.name || student?.name || nim || "Belum ter-assign";
          const heartbeat = heartbeatMap.get(device.code);
          const isOnline = activity?.status === "online" || heartbeat?.status === "online";
          const lastResponse = activity?.lastResponse || null;
          const lastSeen = activity?.lastSeen ? new Date(activity.lastSeen).toLocaleTimeString() : null;
          const deviceLabel = nim ? "Assigned" : activity ? "Active" : "Available";

          return (
            <div
              key={device.code}
              className={`device-card ${nim ? "assigned" : "available"}`}
            >
              <div className="device-card__header">
                <div>
                  <span className="device-code">{device.code}</span>
                  <span className={`device-status ${isOnline ? "online" : "offline"}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <span className="device-chip">{deviceLabel}</span>
              </div>

              <div className="device-card__body">
                {nim ? (
                  <div className="student-info">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={displayName}
                        className="student-avatar"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = getPhotoPlaceholder(displayName);
                        }}
                      />
                    ) : (
                      <div className="student-avatar student-avatar--text">
                        {buildInitials(displayName)}
                      </div>
                    )}
                    <div>
                      <div className="student-name">{displayName}</div>
                      <div className="student-nim">{nim}</div>
                      {lastResponse && (
                        <div className="student-response">
                          Jawaban: <strong>{lastResponse}</strong>
                          {lastSeen ? ` · ${lastSeen}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="student-empty">Belum ada mahasiswa</div>
                )}
              </div>

              <div className="device-card__footer">
                <button
                  className="btn-reset"
                  onClick={() => handleReset(device.code)}
                  disabled={!nim || resettingCode === device.code}
                >
                  {resettingCode === device.code ? "Mereset..." : "Reset"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loadingStudents && (
        <div className="polling-device-management__loading">Memuat data mahasiswa...</div>
      )}
    </div>
  );
}
