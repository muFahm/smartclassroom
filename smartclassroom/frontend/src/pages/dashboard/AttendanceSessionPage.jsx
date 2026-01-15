import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/client";

export default function AttendanceSessionPage() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [present, setPresent] = useState([]);

  const sessionIdRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureTimer = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (captureTimer.current) clearInterval(captureTimer.current);
    };
  }, []);

  function startCamera() {
    return navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      return stream;
    });
  }

  function stopCamera() {
    const s = streamRef.current;
    if (s && s.getTracks) {
      s.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startSession() {
    setError(null);
    setStatus(null);
    try {
      const res = await apiRequest("/api/accounts/attendance/sessions/start/", { method: "POST" });
      const data = await res.json();
      setSessionId(data.session_id);
      sessionIdRef.current = data.session_id;
      setIsActive(true);
      setStatus("Session started");
      await startCamera();

      // start periodic capture
      captureTimer.current = setInterval(() => captureAndSend(), 2000);
    } catch (e) {
      setError(e.message);
    }
  }

  async function captureAndSend() {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const video = videoRef.current;
    if (!video) return;
    if (!video.videoWidth || !video.videoHeight) return;
    const w = 320;
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 240;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
    if (!blob) return;

    const form = new FormData();
    form.append("image", blob, "frame.jpg");

    try {
      const res = await apiRequest(`/api/accounts/attendance/sessions/${sid}/recognize/`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      // data.results is array of {label,distance,student,already_recorded}
      setPresent((prev) => {
        const next = [...prev];
        for (const r of data.results || []) {
          if (r.student) {
            const exists = next.find((p) => p.id === r.student.id);
            if (!exists) next.push({ ...r.student, time: new Date().toISOString(), distance: r.distance });
          }
        }
        return next;
      });
    } catch (e) {
      // ignore transient errors but show first
      setError(e.message);
    }
  }

  async function stopSession() {
    if (!sessionId) return;
    try {
      await apiRequest(`/api/accounts/attendance/sessions/${sessionId}/stop/`, { method: "POST" });
    } catch (e) {
      setError(e.message);
    } finally {
      setIsActive(false);
      setStatus("Session stopped");
      if (captureTimer.current) {
        clearInterval(captureTimer.current);
        captureTimer.current = null;
      }
      stopCamera();
    }
  }

  async function refreshList() {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const res = await apiRequest(`/api/accounts/attendance/sessions/${sid}/records/`);
      const data = await res.json();
      // API returns AttendanceRecord[]; normalize to the same shape as live list
      const normalized = Array.isArray(data)
        ? data
            .map((r) => {
              const s = r.student;
              if (!s) return null;
              return { ...s, time: r.timestamp || new Date().toISOString() };
            })
            .filter(Boolean)
        : [];
      setPresent(normalized);
    } catch (e) {
      setError(e.message);
    }
  }

  if (!user || user.role !== "lecturer") {
    return <p>Halaman ini hanya untuk dosen (lecturer).</p>;
  }

  return (
    <div>
      <h2>Absensi (Live)</h2>
      <div className="card">
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <video ref={videoRef} autoPlay playsInline style={{ width: 420, borderRadius: 8, background: "#111" }} />
            <div style={{ marginTop: 8 }}>
              {!isActive && <button onClick={startSession}>Start Session</button>}
              {isActive && <button onClick={stopSession}>Stop Session</button>}
              <button onClick={refreshList} className="secondary">Refresh List</button>
            </div>
            {error && <p style={{ color: "crimson" }}>{error}</p>}
            {status && <p style={{ color: "green" }}>{status}</p>}
          </div>

          <div style={{ minWidth: 320 }}>
            <h3>Present ({present.length})</h3>
            <ul>
              {present.map((p) => (
                <li key={p.id}>
                  <b>{p.username}</b> ({p.email}) — {new Date(p.time).toLocaleTimeString()}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
