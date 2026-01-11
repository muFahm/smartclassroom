import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/client";

const MIN_SECONDS = 30;

function pickBestMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const t of candidates) {
    // MediaRecorder.isTypeSupported may be undefined on some browsers
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

export default function VoiceEnrollmentPage() {
  const { isAuthenticated } = useAuth();

  const [enrollmentId, setEnrollmentId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const stream = streamRef.current;
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnrollment() {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const res = await apiRequest(`/api/accounts/biometrics/voice/enrollments/start/`, { method: "POST" });
      const data = await res.json();
      setEnrollmentId(data.enrollment_id);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setSeconds(0);
      setStatus("Enrollment suara dimulai.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    setError(null);
    setStatus(null);
    if (!enrollmentId) {
      setError("Klik Start Enrollment dulu.");
      return;
    }
    if (recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickBestMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          chunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = () => {
        const finalType = mimeType || chunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setStatus("Rekaman selesai. Silakan upload.");
      };

      setSeconds(0);
      setRecording(true);
      recorder.start(1000);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MIN_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

      setStatus(`Merekam... (0/${MIN_SECONDS} detik)`);
    } catch (e) {
      setError("Tidak bisa akses mikrofon. Pastikan izin mikrofon di browser.");
      setRecording(false);
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    try {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    } catch (_) {
      // ignore
    }
    try {
      const stream = streamRef.current;
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;
    } catch (_) {
      // ignore
    }
  }

  async function uploadSample() {
    setError(null);
    setStatus(null);
    if (!enrollmentId) {
      setError("Klik Start Enrollment dulu.");
      return;
    }
    if (!audioBlob) {
      setError("Rekam suara dulu.");
      return;
    }
    if (seconds < MIN_SECONDS) {
      setError(`Minimal rekaman ${MIN_SECONDS} detik.`);
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      const ext = (audioBlob.type || "audio/webm").includes("ogg") ? "ogg" : "webm";
      form.append("audio", audioBlob, `voice_sample.${ext}`);
      const res = await apiRequest(`/api/accounts/biometrics/voice/enrollments/${enrollmentId}/samples/`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data?.voice_active_ms != null) {
        setStatus(`Upload OK. Voice active: ${Math.round(data.voice_active_ms / 1000)} detik.`);
      } else {
        setStatus("Upload OK.");
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
      const res = await apiRequest(`/api/accounts/biometrics/voice/enrollments/${enrollmentId}/complete/`, { method: "POST" });
      const data = await res.json();
      setStatus(data?.detail || "Voice enrollment selesai (aktif).");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>Registrasi Suara</h2>
      <p>Rekam suara minimal {MIN_SECONDS} detik. Backend akan menghitung suara efektif (VAD).</p>

      {!isAuthenticated && <p style={{ color: "crimson" }}>Token tidak ditemukan. Silakan login ulang.</p>}

      <div className="card">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ minWidth: 320 }}>
            <div className="row">
              <button onClick={startEnrollment} disabled={busy || recording}>
                Start Enrollment
              </button>
              <button className="secondary" onClick={startRecording} disabled={busy || recording || !enrollmentId}>
                Mulai Rekam
              </button>
              <button className="secondary" onClick={stopRecording} disabled={busy || !recording}>
                Stop
              </button>
            </div>

            <p style={{ marginTop: 12 }}>
              <b>Enrollment ID:</b> {enrollmentId || "-"}
            </p>
            <p>
              <b>Durasi rekaman:</b> {seconds}/{MIN_SECONDS} detik
            </p>

            {audioUrl && (
              <div style={{ marginTop: 12 }}>
                <p style={{ marginBottom: 6 }}>
                  <b>Preview:</b>
                </p>
                <audio controls src={audioUrl} />
              </div>
            )}

            <div className="row" style={{ marginTop: 12 }}>
              <button onClick={uploadSample} disabled={busy || recording || !audioBlob || seconds < MIN_SECONDS}>
                Upload Sample
              </button>
              <button className="secondary" onClick={complete} disabled={busy || recording || !enrollmentId}>
                Complete
              </button>
            </div>

            {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
            {status && <p style={{ color: "green", marginTop: 12 }}>{status}</p>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Checklist</h3>
        <ul>
          <li>Rekam di ruangan tidak bising</li>
          <li>Bicara natural (jangan terlalu pelan)</li>
          <li>Hindari jarak terlalu jauh dari mic</li>
        </ul>
      </div>
    </div>
  );
}
