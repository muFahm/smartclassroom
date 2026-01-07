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
