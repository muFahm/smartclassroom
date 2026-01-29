import React, { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./EkspresiSuara.css";
import { initVoiceAnalytics } from "../services/voiceAnalyticsService";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function EkspresiSuara() {
  const [summary, setSummary] = useState({
    fokus: 0,
    bahagia: 0,
    sedih: 0,
    bosan: 0,
  });

  useEffect(() => {
    const handleEmotion = (payload) => {
      setSummary({
        fokus: payload.fokus ?? 0,
        bahagia: payload.bahagia ?? 0,
        sedih: payload.sedih ?? 0,
        bosan: payload.bosan ?? 0,
      });
    };

    const connection = initVoiceAnalytics(null, handleEmotion);

    return () => {
      if (connection?.disconnect) connection.disconnect();
    };
  }, []);

  const chartData = {
    labels: ["Fokus", "Bahagia", "Sedih", "Bosan"],
    datasets: [
      {
        data: [
          summary.fokus,
          summary.bahagia,
          summary.sedih,
          summary.bosan,
        ],
        backgroundColor: [
          "#10b981", // green - Fokus
          "#f59e0b", // orange - Bahagia
          "#ef4444", // red - Sedih
          "#eab308", // yellow - Bosan
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.8,
    plugins: {
      legend: {
        display: true,
        position: "right",
        align: "center",
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          padding: 6,
          font: {
            size: 9,
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            return context.label + ": " + context.parsed + "%";
          },
        },
      },
      datalabels: {
        color: "#fff",
        font: {
          weight: "bold",
          size: 10,
        },
        formatter: (value) => {
          return value + "%";
        },
      },
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
  };

  return (
    <div className="ekspresi-suara-card">
      <div className="ekspresi-suara-header">
        <h3 className="ekspresi-suara-title">Ekspresi Suara</h3>
      </div>

      <div className="chart-container">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
