import React, { useState, useEffect } from 'react';
import { initEnvironmentROS2, getCurrentSensorData } from '../services/environmentService';
import './Suhu.css';

export default function Suhu() {
  const [temperature, setTemperature] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    // Initialize ROS2 connection for sensor data
    const connection = initEnvironmentROS2(
      // onSensorUpdate callback
      (sensorData) => {
        if (sensorData.temperature !== null) {
          setTemperature(sensorData.temperature);
          setDeviceId(sensorData.deviceId);
        }
      },
      // onConnectionChange callback
      (status) => {
        setIsConnected(status.connected);
      }
    );

    // Get initial data if already connected
    const currentData = getCurrentSensorData();
    if (currentData.temperature !== null) {
      setTemperature(currentData.temperature);
      setDeviceId(currentData.deviceId);
      setIsConnected(currentData.isConnected);
    }

    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.disconnect();
      }
    };
  }, []);

  // Format temperature display - only show value if connected and data exists
  const displayTemp = isConnected && temperature !== null 
    ? `${Math.round(temperature)} °C` 
    : '-';

  return (
    <div className="suhu-card">
      <div className="suhu-header">
        <h3 className="suhu-title">Suhu</h3>
        <span className={`suhu-status-dot ${isConnected ? 'connected' : ''}`} title={isConnected ? 'Connected' : 'Disconnected'}></span>
      </div>
      <div className="suhu-content">
        <svg 
          className="suhu-icon" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            d="M14 14.76V3.5C14 2.67 13.33 2 12.5 2C11.67 2 11 2.67 11 3.5V14.76C9.78 15.37 9 16.62 9 18C9 20.21 10.79 22 13 22C15.21 22 17 20.21 17 18C17 16.62 16.22 15.37 15 14.76H14ZM12.5 4C12.78 4 13 4.22 13 4.5V8H12V4.5C12 4.22 12.22 4 12.5 4Z" 
            fill="currentColor"
          />
        </svg>
        <div className="suhu-value">{displayTemp}</div>
      </div>
      {isConnected && deviceId && (
        <div className="suhu-footer">
          <span className="suhu-device-id">{deviceId}</span>
        </div>
      )}
    </div>
  );
}