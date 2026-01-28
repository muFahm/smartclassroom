import React, { useState, useEffect } from 'react';
import { initEnvironmentROS2, getCurrentSensorData } from '../services/environmentService';
import './Cahaya.css';

export default function Cahaya() {
  const [lux, setLux] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    // Initialize ROS2 connection for sensor data
    const connection = initEnvironmentROS2(
      // onSensorUpdate callback
      (sensorData) => {
        if (sensorData.lux !== null) {
          setLux(sensorData.lux);
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
    if (currentData.lux !== null) {
      setLux(currentData.lux);
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

  // Format lux display - only show value if connected and data exists
  const displayLux = isConnected && lux !== null 
    ? `${Math.round(lux)} Lux` 
    : '-';

  return (
    <div className="cahaya-card">
      <div className="cahaya-header">
        <h3 className="cahaya-title">Cahaya</h3>
        <span className={`cahaya-status-dot ${isConnected ? 'connected' : ''}`} title={isConnected ? 'Connected' : 'Disconnected'}></span>
      </div>
      <div className="cahaya-content">
        <svg 
          className="cahaya-icon" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 2L14.39 5.42C13.65 5.15 12.84 5 12 5C11.16 5 10.35 5.15 9.61 5.42L12 2ZM3.34 7L7.5 6.65C6.9 7.16 6.36 7.78 5.94 8.46C5.5 9.17 5.19 9.95 5.04 10.78L3.34 7ZM3.36 17L5.08 13.37C5.23 14.2 5.54 14.97 5.98 15.68C6.39 16.36 6.93 16.98 7.53 17.49L3.36 17ZM20.65 7L18.94 10.21C18.78 9.39 18.47 8.62 18.03 7.92C17.61 7.23 17.07 6.62 16.47 6.11L20.65 7ZM20.64 17L16.48 17.35C17.08 16.85 17.62 16.22 18.04 15.54C18.48 14.83 18.79 14.05 18.94 13.23L20.64 17ZM12 22L9.59 18.56C10.33 18.83 11.14 19 12 19C12.86 19 13.67 18.83 14.41 18.56L12 22Z" 
            fill="currentColor"
          />
        </svg>
        <div className="cahaya-value">{displayLux}</div>
      </div>
      {isConnected && deviceId && (
        <div className="cahaya-footer">
          <span className="cahaya-device-id">{deviceId}</span>
        </div>
      )}
    </div>
  );
}