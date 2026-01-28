import React, { useCallback, useEffect, useRef, useState } from "react";
import "./BiometricRegistration.css";
import { fetchStudentData } from "../../services/studentDataService";
import {
  createBiometricRegistration,
  createFaceDataset,
  createVoiceDataset,
} from "../../services/biometricRegistrationService";

const FACE_ANGLES = [
  {
    key: "front",
    label: "Depan",
    hint: "Hadapkan wajah lurus ke kamera.",
  },
  {
    key: "left",
    label: "Kiri",
    hint: "Putar wajah sedikit ke kiri.",
  },
  {
    key: "right",
    label: "Kanan",
    hint: "Putar wajah sedikit ke kanan.",
  },
  {
    key: "up",
    label: "Atas",
    hint: "Turunkan wajah sedikit ke bawah.",
  },
];

const VOICE_PROMPTS = [
  "Saya mahasiswa Universitas Trisakti. Hari ini saya melakukan registrasi biometrik di SmartClassroom untuk kebutuhan presensi dan keamanan data. Saya siap mengikuti kegiatan perkuliahan dengan tertib dan bertanggung jawab. Dalam proses ini saya membaca teks verifikasi suara agar sistem mengenali karakter suara saya dengan jelas dan akurat.",
  "Pada rekaman kedua ini, saya membaca teks verifikasi suara dengan lebih panjang. Sistem akan menggunakan contoh suara saya untuk identifikasi. Saya berkomitmen menjaga integritas akademik dan menggunakan sistem ini sesuai aturan. Semoga rekaman ini membantu proses verifikasi dan memastikan kualitas dataset yang tersimpan.",
];

const MAX_RECORD_SECONDS = 30;

function formatSeconds(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function dataUrlFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca data audio"));
    reader.readAsDataURL(blob);
  });
}

export default function BiometricRegistration() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);

  const [nim, setNim] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");

  const [cameraError, setCameraError] = useState("");
  const [faceCaptures, setFaceCaptures] = useState({});

  const [recordingState, setRecordingState] = useState({
    activeKey: null,
    seconds: 0,
    isRecording: false,
  });
  const [voiceRecordings, setVoiceRecordings] = useState({});
  const [audioError, setAudioError] = useState("");

  const [saveStatus, setSaveStatus] = useState({
    loading: false,
    success: "",
    error: "",
  });
  const [faceSaveStatus, setFaceSaveStatus] = useState({
    loading: false,
    success: "",
    error: "",
  });
  const [voiceSaveStatus, setVoiceSaveStatus] = useState({
    loading: false,
    success: "",
    error: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (!isMounted) return;
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        if (!isMounted) return;
        setCameraError("Kamera tidak tersedia atau izin ditolak.");
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  const handleLookupStudent = useCallback(async () => {
    if (!nim.trim()) {
      setStudentError("Masukkan NIM terlebih dahulu.");
      return;
    }

    setStudentLoading(true);
    setStudentError("");

    try {
      const data = await fetchStudentData(nim.trim());
      if (data?.error) {
        setStudentError("Data mahasiswa tidak ditemukan.");
        setStudentInfo(null);
      } else {
        setStudentInfo(data);
      }
    } catch (error) {
      setStudentError("Gagal memuat data mahasiswa.");
      setStudentInfo(null);
    } finally {
      setStudentLoading(false);
    }
  }, [nim]);

  const handleCaptureFace = useCallback(
    (angleKey) => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      const targetWidth = 520;
      const scale = targetWidth / width;
      const targetHeight = Math.round(height * scale);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, targetWidth, targetHeight);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      setFaceCaptures((prev) => ({
        ...prev,
        [angleKey]: {
          dataUrl,
          capturedAt: Date.now(),
          mimeType: "image/jpeg",
        },
      }));
    },
    []
  );

  const stopRecordingTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopAudioStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  const handleStopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const handleStartRecording = useCallback(
    async (key) => {
      if (recordingState.isRecording) return;

      setAudioError("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        const mimeTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
        ];
        const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = async () => {
          stopRecordingTimer();
          stopAudioStream();

          const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
          const blobUrl = URL.createObjectURL(blob);
          try {
            const dataUrl = await dataUrlFromBlob(blob);
            setVoiceRecordings((prev) => ({
              ...prev,
              [key]: {
                dataUrl,
                blobUrl,
                mimeType: blob.type || mimeType || "audio/webm",
                duration: secondsRef.current || MAX_RECORD_SECONDS,
              },
            }));
          } catch (error) {
            setAudioError("Gagal menyimpan rekaman suara.");
          }

          secondsRef.current = 0;
          setRecordingState({ activeKey: null, seconds: 0, isRecording: false });
        };

        recorderRef.current = recorder;
        recorder.start();
        secondsRef.current = 0;
        setRecordingState({ activeKey: key, seconds: 0, isRecording: true });

        timerRef.current = setInterval(() => {
          setRecordingState((prev) => {
            const nextSeconds = prev.seconds + 1;
            secondsRef.current = Math.min(nextSeconds, MAX_RECORD_SECONDS);
            if (nextSeconds >= MAX_RECORD_SECONDS) {
              handleStopRecording();
            }
            return { ...prev, seconds: Math.min(nextSeconds, MAX_RECORD_SECONDS) };
          });
        }, 1000);
      } catch (error) {
        setAudioError("Mikrofon tidak tersedia atau izin ditolak.");
      }
    },
    [handleStopRecording, recordingState.isRecording]
  );

  const allFacesCaptured = FACE_ANGLES.every((angle) => faceCaptures[angle.key]?.dataUrl);
  const allVoicesCaptured = ["first", "second"].every((key) => voiceRecordings[key]?.dataUrl);

  const handleSave = useCallback(async () => {
    setSaveStatus({ loading: true, success: "", error: "" });

    if (!nim.trim()) {
      setSaveStatus({ loading: false, success: "", error: "NIM wajib diisi." });
      return;
    }
    if (!allFacesCaptured) {
      setSaveStatus({
        loading: false,
        success: "",
        error: "Lengkapi 4 foto wajah terlebih dahulu.",
      });
      return;
    }
    if (!allVoicesCaptured) {
      setSaveStatus({
        loading: false,
        success: "",
        error: "Lengkapi 2 rekaman suara terlebih dahulu.",
      });
      return;
    }

    try {
      const payload = {
        student_nim: nim.trim(),
        student_name: studentInfo?.name || "",
        face_front: faceCaptures.front?.dataUrl || "",
        face_left: faceCaptures.left?.dataUrl || "",
        face_right: faceCaptures.right?.dataUrl || "",
        face_up: faceCaptures.up?.dataUrl || "",
        face_front_mime: faceCaptures.front?.mimeType || "image/jpeg",
        face_left_mime: faceCaptures.left?.mimeType || "image/jpeg",
        face_right_mime: faceCaptures.right?.mimeType || "image/jpeg",
        face_up_mime: faceCaptures.up?.mimeType || "image/jpeg",
        voice_prompt_1_text: VOICE_PROMPTS[0],
        voice_prompt_2_text: VOICE_PROMPTS[1],
        voice_recording_1: voiceRecordings.first?.dataUrl || "",
        voice_recording_2: voiceRecordings.second?.dataUrl || "",
        voice_recording_1_mime: voiceRecordings.first?.mimeType || "audio/webm",
        voice_recording_2_mime: voiceRecordings.second?.mimeType || "audio/webm",
        voice_recording_1_duration: voiceRecordings.first?.duration || MAX_RECORD_SECONDS,
        voice_recording_2_duration: voiceRecordings.second?.duration || MAX_RECORD_SECONDS,
      };

      await createBiometricRegistration(payload);
      setSaveStatus({
        loading: false,
        success: "Registrasi biometrik berhasil disimpan.",
        error: "",
      });
    } catch (error) {
      setSaveStatus({
        loading: false,
        success: "",
        error: "Gagal menyimpan registrasi biometrik. Periksa koneksi server.",
      });
    }
  }, [allFacesCaptured, allVoicesCaptured, nim, studentInfo, faceCaptures, voiceRecordings]);

  const handleSaveFaceDataset = useCallback(async () => {
    setFaceSaveStatus({ loading: true, success: "", error: "" });

    if (!nim.trim()) {
      setFaceSaveStatus({ loading: false, success: "", error: "NIM wajib diisi." });
      return;
    }
    if (!allFacesCaptured) {
      setFaceSaveStatus({
        loading: false,
        success: "",
        error: "Lengkapi 4 foto wajah terlebih dahulu.",
      });
      return;
    }

    try {
      const payload = {
        student_nim: nim.trim(),
        student_name: studentInfo?.name || "",
        face_front: faceCaptures.front?.dataUrl || "",
        face_left: faceCaptures.left?.dataUrl || "",
        face_right: faceCaptures.right?.dataUrl || "",
        face_up: faceCaptures.up?.dataUrl || "",
        face_front_mime: faceCaptures.front?.mimeType || "image/jpeg",
        face_left_mime: faceCaptures.left?.mimeType || "image/jpeg",
        face_right_mime: faceCaptures.right?.mimeType || "image/jpeg",
        face_up_mime: faceCaptures.up?.mimeType || "image/jpeg",
      };
      await createFaceDataset(payload);
      setFaceSaveStatus({
        loading: false,
        success: "Dataset wajah berhasil disimpan.",
        error: "",
      });
    } catch (error) {
      setFaceSaveStatus({
        loading: false,
        success: "",
        error: "Gagal menyimpan dataset wajah.",
      });
    }
  }, [allFacesCaptured, nim, studentInfo, faceCaptures]);

  const handleSaveVoiceDataset = useCallback(async () => {
    setVoiceSaveStatus({ loading: true, success: "", error: "" });

    if (!nim.trim()) {
      setVoiceSaveStatus({ loading: false, success: "", error: "NIM wajib diisi." });
      return;
    }
    if (!allVoicesCaptured) {
      setVoiceSaveStatus({
        loading: false,
        success: "",
        error: "Lengkapi 2 rekaman suara terlebih dahulu.",
      });
      return;
    }

    try {
      const payload = {
        student_nim: nim.trim(),
        student_name: studentInfo?.name || "",
        voice_prompt_1_text: VOICE_PROMPTS[0],
        voice_prompt_2_text: VOICE_PROMPTS[1],
        voice_recording_1: voiceRecordings.first?.dataUrl || "",
        voice_recording_2: voiceRecordings.second?.dataUrl || "",
        voice_recording_1_mime: voiceRecordings.first?.mimeType || "audio/webm",
        voice_recording_2_mime: voiceRecordings.second?.mimeType || "audio/webm",
        voice_recording_1_duration: voiceRecordings.first?.duration || MAX_RECORD_SECONDS,
        voice_recording_2_duration: voiceRecordings.second?.duration || MAX_RECORD_SECONDS,
      };
      await createVoiceDataset(payload);
      setVoiceSaveStatus({
        loading: false,
        success: "Dataset suara berhasil disimpan.",
        error: "",
      });
    } catch (error) {
      setVoiceSaveStatus({
        loading: false,
        success: "",
        error: "Gagal menyimpan dataset suara.",
      });
    }
  }, [allVoicesCaptured, nim, studentInfo, voiceRecordings]);

  return (
    <div className="biometric-registration">
      <div className="biometric-header">
        <div>
          <h2>Registrasi Biometrik</h2>
          <p className="muted">
            Lengkapi 4 foto wajah dan 2 rekaman suara untuk mahasiswa.
          </p>
        </div>
        <div className="biometric-status">
          <span className={allFacesCaptured ? "status-chip success" : "status-chip"}>
            Wajah {Object.keys(faceCaptures).length}/4
          </span>
          <span className={allVoicesCaptured ? "status-chip success" : "status-chip"}>
            Suara {Object.keys(voiceRecordings).length}/2
          </span>
        </div>
      </div>

      <div className="biometric-grid">
        <section className="biometric-card">
          <h3>Data Mahasiswa</h3>
          <div className="form-row">
            <label htmlFor="nim">NIM</label>
            <div className="input-group">
              <input
                id="nim"
                type="text"
                placeholder="Masukkan NIM"
                value={nim}
                onChange={(event) => setNim(event.target.value)}
              />
              <button
                className="btn primary"
                onClick={handleLookupStudent}
                disabled={studentLoading}
              >
                {studentLoading ? "Memuat..." : "Cek"}
              </button>
            </div>
            {studentError && <span className="error-text">{studentError}</span>}
          </div>

          <div className="student-preview">
            <div className="student-photo">
              {studentInfo?.photo ? (
                <img src={studentInfo.photo} alt={studentInfo.name || "Mahasiswa"} />
              ) : (
                <div className="photo-placeholder">Foto</div>
              )}
            </div>
            <div>
              <p className="student-name">
                {studentInfo?.name || "Nama mahasiswa"}
              </p>
              <p className="muted">NIM: {nim || "-"}</p>
            </div>
          </div>
        </section>

        <section className="biometric-card camera-card">
          <h3>Pengambilan Foto Wajah</h3>
          <p className="muted">Pastikan pencahayaan cukup dan wajah terlihat jelas.</p>
          <div className="camera-scroll">
            {cameraError ? (
              <div className="error-text">{cameraError}</div>
            ) : (
              <div className="camera-preview">
                <video ref={videoRef} autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden-canvas" />
              </div>
            )}

            <div className="face-grid">
              {FACE_ANGLES.map((angle) => {
                const capture = faceCaptures[angle.key];
                return (
                  <div key={angle.key} className="face-card">
                    <div className="face-image">
                      {capture?.dataUrl ? (
                        <img src={capture.dataUrl} alt={`Wajah ${angle.label}`} />
                      ) : (
                        <div className="photo-placeholder">{angle.label}</div>
                      )}
                    </div>
                    <div className="face-info">
                      <h4>{angle.label}</h4>
                      <p className="muted">{angle.hint}</p>
                    </div>
                    <button
                      className="btn outline"
                      onClick={() => handleCaptureFace(angle.key)}
                      disabled={!!cameraError}
                    >
                      {capture ? "Ulangi" : "Ambil"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section-actions">
            {faceSaveStatus.error && (
              <span className="error-text">{faceSaveStatus.error}</span>
            )}
            {faceSaveStatus.success && (
              <span className="success-text">{faceSaveStatus.success}</span>
            )}
            <button
              className="btn outline"
              onClick={handleSaveFaceDataset}
              disabled={faceSaveStatus.loading}
            >
              {faceSaveStatus.loading ? "Menyimpan..." : "Simpan Dataset Wajah"}
            </button>
          </div>
        </section>

        <section className="biometric-card voice-card">
          <h3>Registrasi Suara</h3>
          <p className="muted">Rekam 2 kali, masing-masing maksimal 30 detik.</p>
          <div className="voice-scroll">
            {audioError && <div className="error-text">{audioError}</div>}

            {["first", "second"].map((key, index) => {
              const recording = voiceRecordings[key];
              const isActive = recordingState.activeKey === key && recordingState.isRecording;
              const secondsLeft = MAX_RECORD_SECONDS - recordingState.seconds;
              return (
                <div key={key} className="voice-block">
                  <div className="voice-header">
                    <h4>Rekaman {index + 1}</h4>
                    <span className={recording ? "status-chip success" : "status-chip"}>
                      {recording ? "Tersimpan" : "Belum ada"}
                    </span>
                  </div>
                  <p className="prompt-text">{VOICE_PROMPTS[index]}</p>

                  <div className="voice-controls">
                    {!isActive ? (
                      <button
                        className="btn primary"
                        onClick={() => handleStartRecording(key)}
                      >
                        {recording ? "Rekam ulang" : "Mulai rekam"}
                      </button>
                    ) : (
                      <button className="btn danger" onClick={handleStopRecording}>
                        Hentikan
                      </button>
                    )}

                    <div className="timer">
                      {isActive ? (
                        <span>{formatSeconds(recordingState.seconds)} / 0:{MAX_RECORD_SECONDS}</span>
                      ) : (
                        <span>Sisa {formatSeconds(secondsLeft)}</span>
                      )}
                    </div>
                  </div>

                  {recording?.blobUrl && (
                    <audio controls src={recording.blobUrl} className="audio-preview" />
                  )}
                </div>
              );
            })}

            <div className="section-actions">
              {voiceSaveStatus.error && (
                <span className="error-text">{voiceSaveStatus.error}</span>
              )}
              {voiceSaveStatus.success && (
                <span className="success-text">{voiceSaveStatus.success}</span>
              )}
              <button
                className="btn outline"
                onClick={handleSaveVoiceDataset}
                disabled={voiceSaveStatus.loading}
              >
                {voiceSaveStatus.loading ? "Menyimpan..." : "Simpan Dataset Suara"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="biometric-footer">
        {saveStatus.error && <span className="error-text">{saveStatus.error}</span>}
        {saveStatus.success && <span className="success-text">{saveStatus.success}</span>}
        <button
          className="btn primary large"
          onClick={handleSave}
          disabled={saveStatus.loading}
        >
          {saveStatus.loading ? "Menyimpan..." : "Simpan Registrasi"}
        </button>
      </div>
    </div>
  );
}
