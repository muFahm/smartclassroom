import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/client";

const PROMPTS = [
  { key: "neutral", title: "Foto Close-up (Ekspresi Datar)" },
  { key: "eyes_closed", title: "Foto Mata Merem" },
  { key: "mouth_open", title: "Foto Buka Mulut" },
];

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export default function FaceEnrollmentPage() {
  const { isAuthenticated } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [enrollmentId, setEnrollmentId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState({}); // prompt -> dataUrl
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const currentPrompt = useMemo(() => PROMPTS[stepIndex], [stepIndex]);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setError("Tidak bisa akses webcam. Pastikan izin kamera di browser.");
      }
    }
    startCamera();

    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startEnrollment() {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const res = await apiRequest(`/api/accounts/biometrics/face/enrollments/start/`, { method: "POST" });
      const data = await res.json();
      setEnrollmentId(data.enrollment_id);
      setCaptures({});
      setStepIndex(0);
      setStatus("Enrollment dimulai.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function capture() {
    setError(null);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCaptures((prev) => ({ ...prev, [currentPrompt.key]: dataUrl }));
  }

  async function uploadCurrent() {
    if (!enrollmentId) {
      setError("Klik Start Enrollment dulu.");
      return;
    }
    const dataUrl = captures[currentPrompt.key];
    if (!dataUrl) {
      setError("Ambil foto dulu.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const blob = dataUrlToBlob(dataUrl);
      const form = new FormData();
      form.append("prompt_type", currentPrompt.key);
      form.append("image", blob, `${currentPrompt.key}.jpg`);

      const res = await apiRequest(`/api/accounts/biometrics/face/enrollments/${enrollmentId}/samples/`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Upload gagal");
      }

      setStatus(`Uploaded: ${currentPrompt.title}`);
      if (stepIndex < PROMPTS.length - 1) {
        setStepIndex(stepIndex + 1);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!enrollmentId) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await apiRequest(`/api/accounts/biometrics/face/enrollments/${enrollmentId}/complete/`, { method: "POST" });
      setStatus("Face enrollment selesai (aktif). Embedding akan diisi saat model tersedia.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const readyCount = Object.keys(captures).length;

  return (
    <div>
      <h2>Registrasi Wajah</h2>
      <p>Ambil 3 foto sesuai instruksi: ekspresi datar, mata merem, buka mulut.</p>

      {!isAuthenticated && (
        <p style={{ color: "crimson" }}>
          Token tidak ditemukan. Silakan login ulang.
        </p>
      )}

      <div className="card">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <video ref={videoRef} autoPlay playsInline style={{ width: 420, borderRadius: 8, background: "#111" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>

          <div style={{ minWidth: 320 }}>
            <div className="row">
              <button onClick={startEnrollment} disabled={busy}>
                Start Enrollment
              </button>
              <button className="secondary" onClick={capture} disabled={busy}>
                Ambil Foto
              </button>
            </div>

            <p style={{ marginTop: 12 }}>
              <b>Step {stepIndex + 1}/3:</b> {currentPrompt.title}
            </p>
            <p>
              <b>Enrollment ID:</b> {enrollmentId || "-"}
            </p>
            <p>
              <b>Captured:</b> {readyCount}/3
            </p>

            <div className="row">
              <button onClick={uploadCurrent} disabled={busy || !captures[currentPrompt.key]}>
                Upload Step Ini
              </button>
              <button className="secondary" onClick={complete} disabled={busy || readyCount < 3}>
                Complete
              </button>
            </div>

            {captures[currentPrompt.key] && (
              <div style={{ marginTop: 12 }}>
                <p style={{ marginBottom: 6 }}>
                  <b>Preview:</b>
                </p>
                <img
                  alt="preview"
                  src={captures[currentPrompt.key]}
                  style={{ width: 240, borderRadius: 8, border: "1px solid #ddd" }}
                />
              </div>
            )}

            {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
            {status && <p style={{ color: "green", marginTop: 12 }}>{status}</p>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Checklist</h3>
        <ul>
          <li>Close-up (wajah memenuhi frame)</li>
          <li>Pencahayaan cukup, tidak backlight</li>
          <li>Ekspresi sesuai instruksi</li>
        </ul>
      </div>
    </div>
  );
}
