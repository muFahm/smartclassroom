import React, { useEffect, useState } from "react";
import "./TranskripSuara.css";
import { initVoiceAnalytics } from "../services/voiceAnalyticsService";
import { fetchStudentData, getStudentFromCache } from "../services/studentDataService";

export default function TranskripSuara() {
  const [displayData, setDisplayData] = useState([]);
  const [rosStatus, setRosStatus] = useState({ connected: false, url: null });

  useEffect(() => {
    let mounted = true;

    const handleTranscript = async (entry) => {
      const nim = entry?.nim;
      const text = entry?.text || "";
      const timestamp = entry?.timestamp || Date.now();

      let speaker = entry?.speaker || nim || "-";
      if (speaker && typeof speaker === "string") {
        const cleaned = speaker.replace(/_/g, " ").trim();
        speaker = cleaned.split(/\s+/)[0] || cleaned;
      }
      if (nim) {
        const cached = getStudentFromCache(nim);
        if (cached?.name) {
          speaker = cached.name;
        } else {
          try {
            const student = await fetchStudentData(nim);
            if (student?.name) speaker = student.name;
          } catch (error) {
            // ignore lookup error
          }
        }
      }

      if (!mounted) return;

      setDisplayData((prev) => {
        const next = [
          {
            time: new Date(timestamp).toLocaleTimeString(),
            speaker,
            text,
          },
          ...prev,
        ];
        return next.slice(0, 30);
      });
    };

    const handleStatus = (status) => {
      setRosStatus({ connected: !!status?.connected, url: status?.url || null });
      if (status?.connected) {
        console.log(`ROSBridge connected: ${status.url || "unknown"}`);
      } else {
        console.warn(`ROSBridge disconnected: ${status?.url || "unknown"}`);
      }
    };

    const connection = initVoiceAnalytics(handleTranscript, null, handleStatus);

    return () => {
      mounted = false;
      if (connection?.disconnect) connection.disconnect();
    };
  }, []);

  return (
    <div className="transkrip-suara-card">
      <div className="transkrip-suara-header">
        <h3 className="transkrip-suara-title">Transkrip Suara</h3>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 999,
            background: rosStatus.connected ? "#16a34a" : "#ef4444",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {rosStatus.connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div className="transkrip-content">
        {displayData.map((item, index) => (
          <div key={index} className="transkrip-item">
            <div className="transkrip-time">{item.time}</div>
            <div className="transkrip-text">
              <span className="transkrip-speaker">{item.speaker}</span>
              <span className="transkrip-separator">:</span>
              <span className="transkrip-message">{item.text}</span>
            </div>
          </div>
        ))}
        {displayData.length === 0 && (
          <div className="transkrip-item">
            <div className="transkrip-time">-</div>
            <div className="transkrip-text">
              <span className="transkrip-speaker">-</span>
              <span className="transkrip-separator">:</span>
              <span className="transkrip-message">Belum ada transkrip masuk.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
