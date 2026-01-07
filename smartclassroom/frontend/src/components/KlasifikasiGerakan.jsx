import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./KlasifikasiGerakan.css";
import { MOVEMENT_SUMMARY } from "../utils/mockData";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

export default function KlasifikasiGerakan() {
  const chartData = {
    labels: ["Menunduk", "Menunjuk", "Angkat Tangan"],
    datasets: [
      {
        data: [
          MOVEMENT_SUMMARY.menunduk,
          MOVEMENT_SUMMARY.menunjuk,
          MOVEMENT_SUMMARY.angkatTangan,
        ],
        backgroundColor: [
          "#ef4444", // red - Menunduk
          "#f59e0b", // orange - Menunjuk
          "#eab308", // yellow - Angkat Tangan
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
    <div className="klasifikasi-gerakan-card">
      <div className="klasifikasi-gerakan-header">
        <h3 className="klasifikasi-gerakan-title">Klasifikasi Gerakan</h3>
      </div>

      <div className="chart-container">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
