import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './StatistikPengenalan.css';
import { STATISTICS_VOICE_DATA, STATISTICS_FACE_DATA } from '../utils/mockData';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function StatistikPengenalan() {
  const chartData = {
    labels: STATISTICS_FACE_DATA.labels, // Labels nama mahasiswa
    datasets: [
      {
        label: 'Wajah',
        data: STATISTICS_FACE_DATA.data,
        borderColor: '#3b82f6', // blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)', // light blue fill
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Suara',
        data: STATISTICS_VOICE_DATA.data,
        borderColor: '#f97316', // orange
        backgroundColor: 'rgba(249, 115, 22, 0.1)', // light orange fill
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#f97316',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 15,
          boxHeight: 15,
          padding: 15,
          font: {
            size: 12,
            weight: '500'
          },
          usePointStyle: false,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280'
        }
      },
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 5,
          font: {
            size: 11,
          },
          color: '#6b7280'
        },
        grid: {
          color: '#e5e7eb',
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    }
  };

  return (
    <div className="statistik-pengenalan-card">
      <div className="statistik-pengenalan-header">
        <h3 className="statistik-pengenalan-title">Statistik Pengenalan Wajah dan Suara</h3>
        <button className="toggle-button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4C10 4 4 8.5 4 12C4 14.2091 5.79086 16 8 16H12C14.2091 16 16 14.2091 16 12C16 8.5 10 4 10 4Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="chart-container">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
