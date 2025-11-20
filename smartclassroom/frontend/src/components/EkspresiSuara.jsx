import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./EkspresiSuara.css";
import { VOICE_EXPRESSION_SUMMARY } from "../utils/mockData";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function EkspresiSuara() {
  const chartData = {
    labels: ["Fokus", "Bahagia", "Sedih", "Bosan"],
    datasets: [
      {
        data: [
          VOICE_EXPRESSION_SUMMARY.fokus,
          VOICE_EXPRESSION_SUMMARY.bahagia,
          VOICE_EXPRESSION_SUMMARY.sedih,
          VOICE_EXPRESSION_SUMMARY.bosan,
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
    aspectRatio: 1.5,
    plugins: {
      legend: {
        display: true,
        position: "right",
        align: "center",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 8,
          font: {
            size: 10,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
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
          size: 12,
        },
        formatter: (value) => {
          return value + "%";
        },
      },
    },
    layout: {
      padding: {
        left: 5,
        right: 5,
        top: 5,
        bottom: 5,
      },
    },
  };

  return (
    <div className="ekspresi-suara-card">
      <div className="ekspresi-suara-header">
        <h3 className="ekspresi-suara-title">Ekspresi Suara</h3>
        <button className="toggle-button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4C10 4 4 8.5 4 12C4 14.2091 5.79086 16 8 16H12C14.2091 16 16 14.2091 16 12C16 8.5 10 4 10 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="chart-container">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}