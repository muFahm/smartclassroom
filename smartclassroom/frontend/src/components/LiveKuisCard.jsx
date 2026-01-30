import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Play,
  PlayCircle,
  Users,
} from "lucide-react";
import { quizRequest } from "../api/quizClient";
import { ROS2_CONFIG } from "../config/ros2Topics";
import {
  initPollingResponseBridge,
  publishMessage,
  subscribeDeviceActivity,
} from "../services/pollingDeviceService";
import { fetchMultipleStudents, getStudentFromCache } from "../services/studentDataService";
import { KUIS_ACTIVE } from "../utils/mockData";
import "./LiveKuisCard.css";

const FALLBACK_PACKAGES = [
  {
    id: "demo",
    title: "Demo Live Kuis",
    topic: "Contoh",
    question_count: 1,
  },
];

const FALLBACK_QUESTIONS = [
  {
    id: "demo-q1",
    order: 1,
    body_text: KUIS_ACTIVE.pertanyaan,
    options: KUIS_ACTIVE.pilihan.map((item) => ({
      label: item.label.toUpperCase(),
      body_text: item.text,
      is_correct: item.label.toLowerCase() === KUIS_ACTIVE.jawaban_benar,
    })),
  },
];

const STORAGE_KEY = "liveKuisSelection";

function buildSessionCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function normalizeQuestions(list = []) {
  return list
    .map((question, index) => ({
      id: question.id || `q-${index + 1}`,
      order: question.order || index + 1,
      body_text: question.body_text || question.question_text || "",
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({
            label: option.label || option.key,
            body_text: option.body_text || option.text || "",
            is_correct: !!option.is_correct,
          }))
        : [],
    }))
    .filter((question) => question.body_text);
}

export default function LiveKuisCard() {
  const [packages, setPackages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionStatus, setSessionStatus] = useState("idle");
  const [sessionCode, setSessionCode] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [duration, setDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);
  const [responseStats, setResponseStats] = useState({ total: 0, distribution: {} });
  const [showStats, setShowStats] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [deviceSnapshot, setDeviceSnapshot] = useState(new Map());
  const [responseStream, setResponseStream] = useState([]);
  const [studentData, setStudentData] = useState(new Map());
  const [rosStatus, setRosStatus] = useState({ connected: false, url: null });

  const isQuestionOpenRef = useRef(isQuestionOpen);

  const selectedPackage = useMemo(
    () => packages.find((item) => String(item.id) === String(selectedPackageId)),
    [packages, selectedPackageId]
  );

  const currentQuestion = useMemo(() => {
    if (!questions.length) return null;
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);

  const canStart = !!selectedPackageId && questions.length > 0;
  const isRunning = sessionStatus === "running";
  const isStarted = sessionStatus === "running" || sessionStatus === "ended";

  useEffect(() => {
    isQuestionOpenRef.current = isQuestionOpen;
  }, [isQuestionOpen]);

  const connectedDevices = useMemo(() => {
    return Array.from(deviceSnapshot.values()).sort((a, b) =>
      a.deviceCode.localeCompare(b.deviceCode)
    );
  }, [deviceSnapshot]);

  const activeNims = useMemo(() => {
    const set = new Set();
    connectedDevices.forEach((device) => {
      if (device?.nim) set.add(device.nim);
    });
    responseStream.forEach((entry) => {
      if (entry?.nim) set.add(entry.nim);
    });
    return Array.from(set);
  }, [connectedDevices, responseStream]);

  useEffect(() => {
    if (activeNims.length === 0) {
      setStudentData(new Map());
      return;
    }

    const cached = new Map();
    const missing = [];
    activeNims.forEach((nim) => {
      const data = getStudentFromCache(nim);
      if (data) cached.set(nim, data);
      else missing.push(nim);
    });
    setStudentData(cached);

    if (missing.length) {
      fetchMultipleStudents(missing).then((results) => {
        setStudentData((prev) => new Map([...prev, ...results]));
      });
    }
  }, [activeNims]);

  useEffect(() => {
    let mounted = true;
    const fetchPackages = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await quizRequest("/api/quiz/packages/");
        const data = await response.json();
        const list = data.results || data || [];
        if (mounted) {
          setPackages(list.length ? list : FALLBACK_PACKAGES);
        }
      } catch (err) {
        if (mounted) {
          setPackages(FALLBACK_PACKAGES);
          setError("Gagal memuat paket. Menampilkan paket demo.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored?.packageId) {
      setSelectedPackageId(String(stored.packageId));
    }
    if (stored?.duration) {
      setDuration(Number(stored.duration));
    }

    fetchPackages();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const connection = initPollingResponseBridge(
      (entry) => {
        setResponseStream((prev) => [entry, ...prev].slice(0, 50));
      },
      (status) => {
        setRosStatus({ connected: !!status?.connected, url: status?.url || null });
      }
    );

    const unsubscribe = subscribeDeviceActivity((snapshot) => {
      setDeviceSnapshot(snapshot);
    });
    return () => {
      if (unsubscribe) unsubscribe();
      if (connection?.disconnect) connection.disconnect();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchQuestions = async () => {
      if (!selectedPackageId) return;
      setLoading(true);
      setError("");
      try {
        const response = await quizRequest(`/api/quiz/questions/?package=${selectedPackageId}`);
        const data = await response.json();
        const list = normalizeQuestions(data.results || data || []);
        if (mounted) {
          setQuestions(list.length ? list : FALLBACK_QUESTIONS);
          setCurrentIndex(0);
        }
      } catch (err) {
        if (mounted) {
          setQuestions(FALLBACK_QUESTIONS);
          setCurrentIndex(0);
          setError("Gagal memuat soal. Menampilkan contoh pertanyaan.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchQuestions();
    return () => {
      mounted = false;
    };
  }, [selectedPackageId]);

  useEffect(() => {
    if (!isQuestionOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isQuestionOpen, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isQuestionOpen) {
      setIsQuestionOpen(false);
    }
  }, [timeLeft, isQuestionOpen]);

  const handleStartSession = () => {
    if (!canStart) return;
    const newCode = buildSessionCode();
    setSessionCode(newCode);
    setSessionStatus("running");
    setCurrentIndex(0);
    setIsQuestionOpen(false);
    setIsAnswerRevealed(false);
    setResponseStats({ total: 0, distribution: {} });
    setShowStats(false);
    setShowAnswers(false);
    setResponseStream([]);

    publishMessage(ROS2_CONFIG.topics.polling.sessionStart, {
      session_code: newCode,
      package_id: selectedPackageId,
      package_title: selectedPackage?.title || "",
      timestamp: Date.now(),
    });
  };

  const handleOpenQuestion = () => {
    if (!currentQuestion) return;
    setIsQuestionOpen(true);
    setIsAnswerRevealed(false);
    setTimeLeft(duration);
    setShowStats(false);
    setShowAnswers(false);
    setResponseStream([]);

    publishMessage(ROS2_CONFIG.topics.polling.question, {
      session_code: sessionCode,
      package_id: selectedPackageId,
      question_id: currentQuestion.id,
      order: currentQuestion.order,
      question: currentQuestion.body_text,
      options: currentQuestion.options.map((option) => ({
        key: option.label,
        text: option.body_text,
      })),
      time_limit: duration,
      timestamp: Date.now(),
    });
  };

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) return;
    setCurrentIndex((prev) => prev + 1);
    setIsQuestionOpen(false);
    setIsAnswerRevealed(false);
    setTimeLeft(0);
    setResponseStats({ total: 0, distribution: {} });
    setShowStats(false);
    setShowAnswers(false);
    setResponseStream([]);
  };

  const resolvePhotoSrc = (photo) => {
    if (!photo) return null;
    if (photo.startsWith("data:")) return photo;
    if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
    return `data:image/jpeg;base64,${photo}`;
  };

  const getPhotoPlaceholder = (name = "User") =>
    `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(name)}`;

  const buildInitials = (value = "") =>
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?";

  const handlePrevQuestion = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setIsQuestionOpen(false);
    setIsAnswerRevealed(false);
    setTimeLeft(0);
    setResponseStats({ total: 0, distribution: {} });
    setShowStats(false);
    setShowAnswers(false);
    setResponseStream([]);
  };


  const revealableOptions = currentQuestion?.options || [];
  const correctOption = revealableOptions.find((opt) => opt.is_correct);

  return (
    <div className="live-kuis-card">
      <div className="live-kuis-header">
        <div>
          <h3>Live Kuis</h3>
          <p className="muted">Mode real-time ala Kahoot untuk polling device mahasiswa.</p>
        </div>
        <div className={`status-chip ${isRunning ? "active" : "idle"}`}>
          {isRunning ? "Live" : "Siap"}
        </div>
      </div>

      <div className="live-kuis-body">
        <div className="session-meta">
          <div>
            <p className="muted">Kode Sesi</p>
            <strong>{sessionCode || "-"}</strong>
          </div>
          <div>
            <p className="muted">Paket</p>
            <strong>{selectedPackage?.title || "-"}</strong>
          </div>
          <div>
            <p className="muted">Status</p>
            <strong>{sessionStatus === "running" ? "Sedang berlangsung" : "Belum dimulai"}</strong>
          </div>
        </div>

        <div className="device-panel">
          <div className="device-panel-header">
            <h4>Polling Device Terhubung</h4>
            <span className="pill">{connectedDevices.length} device</span>
          </div>
          <div className="device-list">
            {connectedDevices.length === 0 && (
              <p className="muted">Belum ada device aktif.</p>
            )}
            {connectedDevices.map((device) => (
              (() => {
                const cached = device.nim ? studentData.get(device.nim) : null;
                const displayName = device.name || cached?.name || device.nim;
                const photoSrc = resolvePhotoSrc(cached?.photo);
                return (
                  <div key={device.deviceCode} className={`device-item ${device.status}`}>
                    <span className="device-code">{device.deviceCode}</span>
                    <span className="device-status">{device.status === "online" ? "Online" : "Offline"}</span>
                    {device.lastResponse && (
                      <span className="device-response">{device.lastResponse}</span>
                    )}
                    {device.nim && (
                      <span className="device-student">
                        <span className="device-avatar">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={displayName}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = getPhotoPlaceholder(displayName);
                              }}
                            />
                          ) : (
                            <span className="device-avatar__text">{buildInitials(displayName)}</span>
                          )}
                        </span>
                        <span className="device-student-text">
                          {displayName || device.nim} · {device.nim}
                        </span>
                      </span>
                    )}
                  </div>
                );
              })()
            ))}
          </div>
          <div className="device-panel-footer">
            <span className={`ros-chip ${rosStatus.connected ? "online" : "offline"}`}>
              {rosStatus.connected ? "ROSBridge Live" : "ROSBridge Offline"}
            </span>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {!isStarted && (
          <div className="start-panel">
            <button className="icon-button primary" onClick={handleStartSession} disabled={!canStart || loading}>
              <PlayCircle size={18} />
              Mulai Kuis
            </button>
          </div>
        )}

        {isStarted && (
          <div className="live-kuis-stage">
            <div className="question-header">
              <h4>
                Soal {currentQuestion?.order || "-"} dari {questions.length || "-"}
              </h4>
              <div className={`timer-chip ${isQuestionOpen ? "running" : "idle"}`}>
                {isQuestionOpen ? `Sisa ${timeLeft}s` : "Polling tertutup"}
              </div>
            </div>

            {showStats ? (
              <div className="stats-panel">
                <h4>Ringkasan Respon</h4>
                <div className="stats-summary">
                  <div>
                    <p className="muted">Total Jawaban</p>
                    <strong>{responseStats.total}</strong>
                  </div>
                  <div>
                    <p className="muted">Status Polling</p>
                    <strong>{isQuestionOpen ? "Dibuka" : "Ditutup"}</strong>
                  </div>
                  <div>
                    <p className="muted">Pertanyaan</p>
                    <strong>{currentQuestion ? `#${currentQuestion.order}` : "-"}</strong>
                  </div>
                </div>
                <div className="stats-placeholder">
                  <BarChart3 size={28} />
                  <p>
                    Statistik jawaban akan ditampilkan secara agregat ketika data polling device sudah terhubung.
                  </p>
                </div>
              </div>
            ) : showAnswers ? (
              <div className="answers-panel">
                <h4>Stream Jawaban</h4>
                <div className="answers-list">
                  {responseStream.length === 0 && (
                    <p className="muted">Belum ada jawaban masuk.</p>
                  )}
                  {responseStream.map((entry, index) => {
                    const nim = entry.nim;
                    const cached = nim ? studentData.get(nim) : null;
                    const displayName = entry.name || cached?.name || nim || entry.deviceCode;
                    const photoSrc = resolvePhotoSrc(cached?.photo);
                    return (
                      <div key={`${entry.deviceCode}-${entry.timestamp}-${index}`} className="answer-item">
                        <div className="answer-avatar">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={displayName}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = getPhotoPlaceholder(displayName);
                              }}
                            />
                          ) : (
                            <div className="answer-avatar__text">
                              {buildInitials(displayName)}
                            </div>
                          )}
                        </div>
                        <div className="answer-meta">
                          <div className="answer-name">{displayName}</div>
                          <div className="answer-nim">{nim || "-"}</div>
                        </div>
                        <div className="answer-response">
                          <span className="answer-label">{entry.response || "-"}</span>
                          <span className="answer-time">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="question-panel">
                <p className="question-text">
                  {currentQuestion?.body_text || "Pilih paket soal untuk memulai live kuis."}
                </p>

                <div className="question-options">
                  {revealableOptions.map((option) => {
                    const isCorrect = isAnswerRevealed && option.is_correct;
                    return (
                      <div key={option.label} className={`option-row ${isCorrect ? "correct" : ""}`}>
                        <span className="option-label">{option.label}</span>
                        <span className="option-text">{option.body_text}</span>
                      </div>
                    );
                  })}
                  {!revealableOptions.length && <p className="muted">Belum ada opsi jawaban.</p>}
                </div>

                <div className="question-footer">
                  <div className="answer-status">
                    <span className="muted">Jawaban benar:</span>
                    <strong>{isAnswerRevealed ? correctOption?.label || "-" : "Disembunyikan"}</strong>
                  </div>
                  <p className="muted small">
                    Jawaban peserta tetap disembunyikan. Statistik agregat tersedia di panel statistik.
                  </p>
                </div>
              </div>
            )}

            <div className="live-kuis-controls">
              <button
                className="icon-button"
                onClick={handleOpenQuestion}
                disabled={!currentQuestion || isQuestionOpen}
                title="Mulai pertanyaan"
              >
                <Play size={18} />
              </button>
              <button
                className="icon-button"
                onClick={handlePrevQuestion}
                disabled={currentIndex === 0}
                title="Soal sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                onClick={handleNextQuestion}
                disabled={currentIndex + 1 >= questions.length}
                title="Soal berikutnya"
              >
                <ChevronRight size={18} />
              </button>
              <button
                className="icon-button"
                onClick={handleRevealAnswer}
                disabled={isQuestionOpen || !currentQuestion}
                title="Tampilkan jawaban benar"
              >
                <BadgeCheck size={18} />
              </button>
              <button
                className={`icon-button ${showStats ? "active" : ""}`}
                onClick={() => {
                  setShowStats((prev) => !prev);
                  setShowAnswers(false);
                }}
                title="Statistik"
              >
                <BarChart3 size={18} />
              </button>
              <button
                className={`icon-button ${showAnswers ? "active" : ""}`}
                onClick={() => {
                  setShowAnswers((prev) => !prev);
                  setShowStats(false);
                }}
                title="Answers"
              >
                <Users size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}