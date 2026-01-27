import React, { useState, useEffect, useCallback } from "react";
import { ROS2_CONFIG } from "../../config/ros2Topics";
import "./LivePolling.css";

export default function LivePolling({ deviceCode, nim, onAnswerSubmit }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastActivity, setLastActivity] = useState(null);
  const [answerHistory, setAnswerHistory] = useState([]);

  // Simulated connection to MQTT/ROS2
  useEffect(() => {
    if (!deviceCode) return;

    // Simulate connection
    const connectionTimeout = setTimeout(() => {
      setConnectionStatus("connected");
    }, 1500);

    return () => clearTimeout(connectionTimeout);
  }, [deviceCode]);

  // Listen for quiz from dosen (will be connected to MQTT/ROS2)
  // Currently just waits - quiz will be pushed from dosen's live session
  useEffect(() => {
    if (connectionStatus !== "connected") return;
    
    // TODO: Subscribe to dosen's quiz topic via MQTT
    // The quiz question will be set via setCurrentQuestion when received
    // For now, we just wait in "Menunggu Kuis" state
    
    return () => {
      // Cleanup subscription
    };
  }, [connectionStatus]);

  // Handle answer selection (from button press simulation)
  const handleAnswerSelect = useCallback((answer) => {
    if (!currentQuestion || isSubmitting || submittedAnswer) return;
    
    setSelectedAnswer(answer);
    setLastActivity(new Date().toISOString());
  }, [currentQuestion, isSubmitting, submittedAnswer]);

  // Handle answer submission
  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion || isSubmitting) return;

    setIsSubmitting(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const answerData = {
      deviceCode,
      nim,
      quizId: currentQuestion.quizId,
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      timestamp: new Date().toISOString(),
    };

    setSubmittedAnswer(answerData);
    setAnswerHistory(prev => [answerData, ...prev]);
    onAnswerSubmit?.(answerData);
    setIsSubmitting(false);
  };

  // Simulate ESP32 button press (for demo)
  const simulateButtonPress = (button) => {
    handleAnswerSelect(button);
    // Visual feedback
    const element = document.querySelector(`[data-answer="${button}"]`);
    if (element) {
      element.classList.add("button-press");
      setTimeout(() => element.classList.remove("button-press"), 200);
    }
  };

  // Render no device state
  if (!deviceCode) {
    return (
      <div className="live-polling-card">
        <div className="no-device-state">
          <iconify-icon icon="mdi:remote-off" width="48" height="48"></iconify-icon>
          <h3>Device Belum Terdaftar</h3>
          <p>Daftarkan polling device Anda untuk mengikuti kuis interaktif</p>
        </div>
      </div>
    );
  }

  return (
    <div className="live-polling-card">
      <div className="live-polling-header">
        <div className="polling-header-left">
          <div className="polling-icon">
            <iconify-icon icon="mdi:poll" width="24" height="24"></iconify-icon>
          </div>
          <div>
            <h3>Live Polling</h3>
            <p>Device: <span className="device-code-tag">{deviceCode}</span></p>
          </div>
        </div>
        <div className={`connection-status ${connectionStatus}`}>
          <span className="connection-dot"></span>
          {connectionStatus === "connecting" && "Menghubungkan..."}
          {connectionStatus === "connected" && "Terhubung"}
          {connectionStatus === "disconnected" && "Terputus"}
        </div>
      </div>

      {connectionStatus === "connecting" && (
        <div className="connecting-state">
          <div className="connecting-animation">
            <iconify-icon icon="mdi:loading" width="40" height="40" className="spinning"></iconify-icon>
          </div>
          <p>Menghubungkan ke server polling...</p>
        </div>
      )}

      {connectionStatus === "connected" && !currentQuestion && (
        <div className="waiting-state">
          <div className="waiting-animation">
            <iconify-icon icon="mdi:clock-outline" width="48" height="48"></iconify-icon>
          </div>
          <h4>Menunggu Kuis</h4>
          <p>Tidak ada kuis aktif saat ini. Tetap terhubung untuk menerima pertanyaan dari dosen.</p>
          
          {/* Demo button */}
          <button 
            className="btn-demo-quiz"
            onClick={() => {
              setCurrentQuestion({
                id: "Q001",
                quizId: "QUIZ001",
                quizTitle: "Demo Kuis",
                questionNumber: 1,
                totalQuestions: 1,
                question: "Ini adalah contoh pertanyaan kuis. Pilih jawaban menggunakan tombol di bawah!",
                options: [
                  { key: "A", text: "Pilihan A" },
                  { key: "B", text: "Pilihan B" },
                  { key: "C", text: "Pilihan C" },
                  { key: "D", text: "Pilihan D" },
                ],
                timeLimit: 60,
                startedAt: new Date().toISOString(),
              });
            }}
          >
            <iconify-icon icon="mdi:play" width="18" height="18"></iconify-icon>
            Coba Demo Kuis
          </button>
        </div>
      )}

      {connectionStatus === "connected" && currentQuestion && (
        <div className="question-section">
          <div className="quiz-info-bar">
            <span className="quiz-title">{currentQuestion.quizTitle}</span>
            <span className="question-progress">
              Soal {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
            </span>
          </div>

          <div className="question-content">
            <p className="question-text">{currentQuestion.question}</p>
          </div>

          <div className="options-grid">
            {currentQuestion.options.map((option) => (
              <button
                key={option.key}
                data-answer={option.key}
                className={`option-button ${selectedAnswer === option.key ? "selected" : ""} ${submittedAnswer?.answer === option.key ? "submitted" : ""}`}
                onClick={() => handleAnswerSelect(option.key)}
                disabled={!!submittedAnswer}
              >
                <span className="option-key">{option.key}</span>
                <span className="option-text">{option.text}</span>
                {submittedAnswer?.answer === option.key && (
                  <iconify-icon icon="mdi:check-circle" width="20" height="20" className="submitted-icon"></iconify-icon>
                )}
              </button>
            ))}
          </div>

          {selectedAnswer && !submittedAnswer && (
            <button
              className="btn-submit-answer"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <iconify-icon icon="mdi:loading" width="20" height="20" className="spinning"></iconify-icon>
                  Mengirim...
                </>
              ) : (
                <>
                  <iconify-icon icon="mdi:send" width="20" height="20"></iconify-icon>
                  Kirim Jawaban ({selectedAnswer})
                </>
              )}
            </button>
          )}

          {submittedAnswer && (
            <div className="answer-submitted-banner">
              <iconify-icon icon="mdi:check-circle" width="24" height="24"></iconify-icon>
              <div>
                <strong>Jawaban Terkirim!</strong>
                <p>Anda memilih: <span className="submitted-answer-key">{submittedAnswer.answer}</span></p>
              </div>
            </div>
          )}

          {/* ESP32 Button Simulator */}
          <div className="esp32-simulator">
            <div className="simulator-header">
              <iconify-icon icon="mdi:chip" width="18" height="18"></iconify-icon>
              <span>Simulasi Tombol ESP32</span>
            </div>
            <div className="simulator-buttons">
              {["A", "B", "C", "D", "E"].map((btn) => (
                <button
                  key={btn}
                  className={`esp-button ${selectedAnswer === btn ? "active" : ""}`}
                  onClick={() => simulateButtonPress(btn)}
                  disabled={!!submittedAnswer}
                >
                  {btn}
                </button>
              ))}
            </div>
            <p className="simulator-hint">
              Klik tombol di atas untuk simulasi input dari device fisik
            </p>
          </div>
        </div>
      )}

      {/* Answer History */}
      {answerHistory.length > 0 && (
        <div className="answer-history">
          <h4>
            <iconify-icon icon="mdi:history" width="18" height="18"></iconify-icon>
            Riwayat Jawaban
          </h4>
          <div className="history-list">
            {answerHistory.slice(0, 5).map((answer, index) => (
              <div key={index} className="history-item">
                <span className="history-answer">{answer.answer}</span>
                <span className="history-time">
                  {new Date(answer.timestamp).toLocaleTimeString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
