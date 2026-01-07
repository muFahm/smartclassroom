import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./AktivitasMahasiswa.css";
import { ACTIVITY_SUMMARY } from "../utils/mockData";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function AktivitasMahasiswa() {
  const chartData = {
    labels: ["Duduk", "Berdiri", "Berjalan", "Tidur", "Main Hp"],
    datasets: [
      {
        data: [
          ACTIVITY_SUMMARY.duduk,
          ACTIVITY_SUMMARY.berdiri,
          ACTIVITY_SUMMARY.berjalan,
          ACTIVITY_SUMMARY.tidur,
          ACTIVITY_SUMMARY.mainHp,
        ],
        backgroundColor: [
          "#10b981", // green - Duduk
          "#ef4444", // red - Berdiri
          "#f59e0b", // orange - Berjalan
          "#6b7280", // gray - Tidur
          "#eab308", // yellow - Main Hp
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
    <div className="aktivitas-mahasiswa-card">
      <div className="aktivitas-mahasiswa-header">
        <h3 className="aktivitas-mahasiswa-title">Aktivitas Mahasiswa</h3>
      </div>

      <div className="chart-container">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
