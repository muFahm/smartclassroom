import React, { useState, useEffect, useCallback } from 'react';
import {
  initEnvironmentROS2,
  sendACCommand,
  sendLightCommand,
  getActuatorStates,
  onActuatorStatusChange,
  getRosbridgeUrl,
  setRosbridgeUrl,
} from '../services/environmentService';
import './EnvironmentControl.css';

/**
 * EnvironmentControl - Main area UI untuk kontrol suhu dan cahaya
 * 
 * Fitur:
 * - Kontrol AC: Power on/off, set temperature, mode (cool/heat/fan)
 * - Kontrol Lampu: Power on/off, brightness slider, color temperature
 * - Status koneksi ROS2
 * - Live sensor data display
 */
export default function EnvironmentControl() {
  // ==========================================
  // STATE
  // ==========================================
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState(getRosbridgeUrl());
  const [showSettings, setShowSettings] = useState(false);

  // Sensor data
  const [sensorData, setSensorData] = useState({
    temperature: null,
    lux: null,
    deviceId: null,
    lastUpdate: null,
  });

  // AC control state
  const [acState, setAcState] = useState({
    power: false,
    targetTemperature: 24,
    mode: 'cool',
  });

  // Light control state
  const [lightState, setLightState] = useState({
    power: false,
    brightness: 100,
    colorTemperature: 4000,
  });

  // UI state
  const [isSending, setIsSending] = useState(false);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    // Initialize ROS2 connection
    const connection = initEnvironmentROS2(
      // onSensorUpdate
      (data) => {
        setSensorData({
          temperature: data.temperature,
          lux: data.lux,
          deviceId: data.deviceId,
          lastUpdate: data.lastUpdate,
        });
      },
      // onConnectionChange
      (status) => {
        setIsConnected(status.connected);
      }
    );

    // Subscribe to actuator status changes
    const unsubscribe = onActuatorStatusChange((type, state) => {
      if (type === 'ac') {
        setAcState(prev => ({ ...prev, ...state }));
      } else if (type === 'light') {
        setLightState(prev => ({ ...prev, ...state }));
      }
    });

    // Get initial actuator states
    const states = getActuatorStates();
    setAcState(prev => ({ ...prev, ...states.ac }));
    setLightState(prev => ({ ...prev, ...states.light }));

    return () => {
      connection.disconnect();
      unsubscribe();
    };
  }, []);

  // ==========================================
  // HANDLERS
  // ==========================================

  // AC Controls
  const handleACPower = useCallback(() => {
    const newPower = !acState.power;
    setIsSending(true);
    sendACCommand({
      action: 'power',
      value: newPower ? 'on' : 'off',
    });
    setAcState(prev => ({ ...prev, power: newPower }));
    setTimeout(() => setIsSending(false), 500);
  }, [acState.power]);

  const handleACTemperature = useCallback((delta) => {
    const newTemp = Math.max(16, Math.min(30, acState.targetTemperature + delta));
    setIsSending(true);
    sendACCommand({
      action: 'set_temp',
      value: newTemp,
    });
    setAcState(prev => ({ ...prev, targetTemperature: newTemp }));
    setTimeout(() => setIsSending(false), 300);
  }, [acState.targetTemperature]);

  const handleACMode = useCallback((mode) => {
    setIsSending(true);
    sendACCommand({
      action: 'mode',
      value: mode,
    });
    setAcState(prev => ({ ...prev, mode }));
    setTimeout(() => setIsSending(false), 300);
  }, []);

  // Light Controls
  const handleLightPower = useCallback(() => {
    const newPower = !lightState.power;
    setIsSending(true);
    sendLightCommand({
      action: 'power',
      value: newPower ? 'on' : 'off',
    });
    setLightState(prev => ({ ...prev, power: newPower }));
    setTimeout(() => setIsSending(false), 500);
  }, [lightState.power]);

  const handleLightBrightness = useCallback((value) => {
    setIsSending(true);
    sendLightCommand({
      action: 'brightness',
      value: parseInt(value),
    });
    setLightState(prev => ({ ...prev, brightness: parseInt(value) }));
    setTimeout(() => setIsSending(false), 100);
  }, []);

  const handleLightColorTemp = useCallback((value) => {
    setIsSending(true);
    sendLightCommand({
      action: 'color_temp',
      value: parseInt(value),
    });
    setLightState(prev => ({ ...prev, colorTemperature: parseInt(value) }));
    setTimeout(() => setIsSending(false), 100);
  }, []);

  // Settings
  const handleSaveSettings = useCallback(() => {
    setRosbridgeUrl(connectionUrl);
    setShowSettings(false);
    window.location.reload(); // Reconnect with new URL
  }, [connectionUrl]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--:--';
    return new Date(timestamp).toLocaleTimeString('id-ID');
  };

  const getTemperatureColor = (temp) => {
    if (temp === null) return '#6b7280';
    if (temp < 20) return '#3b82f6';
    if (temp > 28) return '#ef4444';
    return '#22c55e';
  };

  const getLuxColor = (lux) => {
    if (lux === null) return '#6b7280';
    if (lux < 50) return '#6b7280';
    if (lux < 150) return '#f59e0b';
    return '#eab308';
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="environment-control">
      {/* Header */}
      <div className="env-header">
        <div className="env-header-left">
          <h2 className="env-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C10.9 3 10 3.9 10 5V11.17C8.84 11.58 8 12.7 8 14C8 15.66 9.34 17 11 17H13C14.66 17 16 15.66 16 14C16 12.7 15.16 11.58 14 11.17V5C14 3.9 13.1 3 12 3ZM12 5C12.55 5 13 5.45 13 6V7H11V6C11 5.45 11.45 5 12 5Z" fill="currentColor"/>
              <path d="M19 19H5C4.45 19 4 19.45 4 20C4 20.55 4.45 21 5 21H19C19.55 21 20 20.55 20 20C20 19.45 19.55 19 19 19Z" fill="currentColor"/>
            </svg>
            Kontrol Lingkungan Kelas
          </h2>
          <p className="env-subtitle">Atur suhu dan pencahayaan ruangan</p>
        </div>
        <div className="env-header-right">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {isConnected ? 'Terhubung ke ROS2' : 'Tidak Terhubung'}
            </span>
          </div>
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Pengaturan Koneksi"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.68 19.18 11.36 19.13 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.65 2.57 9.61 2.81L9.25 5.35C8.66 5.59 8.12 5.92 7.63 6.29L5.24 5.33C5.02 5.25 4.77 5.33 4.65 5.55L2.74 8.87C2.62 9.08 2.66 9.34 2.86 9.48L4.89 11.06C4.84 11.36 4.8 11.69 4.8 12C4.8 12.31 4.82 12.64 4.87 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 18.45C4.76 18.67 5.01 18.74 5.23 18.67L7.62 17.71C8.12 18.09 8.65 18.41 9.24 18.65L9.6 21.19C9.65 21.43 9.84 21.6 10.08 21.6H13.92C14.16 21.6 14.36 21.43 14.39 21.19L14.75 18.65C15.34 18.41 15.88 18.09 16.37 17.71L18.76 18.67C18.98 18.75 19.23 18.67 19.35 18.45L21.27 15.13C21.39 14.91 21.34 14.66 21.15 14.52L19.14 12.94ZM12 15.6C10.02 15.6 8.4 13.98 8.4 12C8.4 10.02 10.02 8.4 12 8.4C13.98 8.4 15.6 10.02 15.6 12C15.6 13.98 13.98 15.6 12 15.6Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <h4>Pengaturan Koneksi ROSBridge</h4>
          <div className="settings-form">
            <label>
              WebSocket URL:
              <input
                type="text"
                value={connectionUrl}
                onChange={(e) => setConnectionUrl(e.target.value)}
                placeholder="ws://localhost:9090"
              />
            </label>
            <div className="settings-actions">
              <button onClick={handleSaveSettings} className="btn-primary">
                Simpan & Reconnect
              </button>
              <button onClick={() => setShowSettings(false)} className="btn-secondary">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Sensor Display */}
      <div className="sensor-display">
        <div className="sensor-card temperature">
          <div className="sensor-icon" style={{ color: getTemperatureColor(sensorData.temperature) }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M14 14.76V3.5C14 2.67 13.33 2 12.5 2C11.67 2 11 2.67 11 3.5V14.76C9.78 15.37 9 16.62 9 18C9 20.21 10.79 22 13 22C15.21 22 17 20.21 17 18C17 16.62 16.22 15.37 15 14.76H14Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="sensor-info">
            <span className="sensor-label">Suhu Ruangan</span>
            <span className="sensor-value" style={{ color: getTemperatureColor(sensorData.temperature) }}>
              {sensorData.temperature !== null ? `${sensorData.temperature.toFixed(1)}°C` : '--°C'}
            </span>
          </div>
        </div>

        <div className="sensor-card lux">
          <div className="sensor-icon" style={{ color: getLuxColor(sensorData.lux) }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 2L14.39 5.42C13.65 5.15 12.84 5 12 5C11.16 5 10.35 5.15 9.61 5.42L12 2ZM3.34 7L7.5 6.65C6.9 7.16 6.36 7.78 5.94 8.46L3.34 7ZM20.65 7L18.94 10.21C18.78 9.39 18.47 8.62 18.03 7.92L20.65 7ZM12 22L9.59 18.56C10.33 18.83 11.14 19 12 19C12.86 19 13.67 18.83 14.41 18.56L12 22Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="sensor-info">
            <span className="sensor-label">Intensitas Cahaya</span>
            <span className="sensor-value" style={{ color: getLuxColor(sensorData.lux) }}>
              {sensorData.lux !== null ? `${sensorData.lux.toFixed(1)} Lux` : '-- Lux'}
            </span>
          </div>
        </div>

        <div className="sensor-meta">
          <span className="device-id">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M17 1.01L7 1C5.9 1 5 1.9 5 3V21C5 22.1 5.9 23 7 23H17C18.1 23 19 22.1 19 21V3C19 1.9 18.1 1.01 17 1.01ZM17 19H7V5H17V19Z" fill="currentColor"/>
            </svg>
            {sensorData.deviceId || 'Tidak ada perangkat'}
          </span>
          <span className="last-update">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor"/>
            </svg>
            Update: {formatTime(sensorData.lastUpdate)}
          </span>
        </div>
      </div>

      {/* Control Panels - Always show both */}
      <div className="control-panels">
        {/* AC Control Panel */}
        <div className={`control-panel ac-panel ${acState.power ? 'active' : ''}`}>
            <div className="panel-header">
              <h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11H17.83L21.07 7.76C21.46 7.37 21.46 6.74 21.07 6.35L17.66 2.93C17.27 2.54 16.64 2.54 16.24 2.93L12 7.17L7.76 2.93C7.37 2.54 6.73 2.54 6.34 2.93L2.93 6.35C2.54 6.74 2.54 7.37 2.93 7.76L6.17 11H2V13H6.17L2.93 16.24C2.54 16.63 2.54 17.26 2.93 17.65L6.34 21.07C6.74 21.46 7.37 21.46 7.76 21.07L12 16.83L16.24 21.07C16.64 21.46 17.27 21.46 17.66 21.07L21.07 17.65C21.46 17.26 21.46 16.63 21.07 16.24L17.83 13H22V11Z" fill="currentColor"/>
                </svg>
                Kontrol AC
              </h3>
              <button 
                className={`power-btn ${acState.power ? 'on' : 'off'}`}
                onClick={handleACPower}
                disabled={isSending}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 3H11V13H13V3ZM17.83 5.17L16.41 6.59C17.99 7.86 19 9.81 19 12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12C5 9.81 6.01 7.86 7.58 6.58L6.17 5.17C4.23 6.82 3 9.26 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 9.26 19.77 6.82 17.83 5.17Z" fill="currentColor"/>
                </svg>
                {acState.power ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="temperature-control">
              <div className="temp-display">
                <span className="temp-value">{acState.targetTemperature}</span>
                <span className="temp-unit">°C</span>
              </div>
              <div className="temp-buttons">
                <button 
                  className="temp-btn minus"
                  onClick={() => handleACTemperature(-1)}
                  disabled={!acState.power || acState.targetTemperature <= 16 || isSending}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 13H5V11H19V13Z" fill="currentColor"/>
                  </svg>
                </button>
                <button 
                  className="temp-btn plus"
                  onClick={() => handleACTemperature(1)}
                  disabled={!acState.power || acState.targetTemperature >= 30 || isSending}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
              <div className="temp-range">
                <span>16°C</span>
                <div className="range-bar">
                  <div 
                    className="range-fill"
                    style={{ width: `${((acState.targetTemperature - 16) / 14) * 100}%` }}
                  ></div>
                </div>
                <span>30°C</span>
              </div>
            </div>

            <div className="mode-control">
              <span className="mode-label">Mode:</span>
              <div className="mode-buttons">
                <button 
                  className={`mode-btn ${acState.mode === 'cool' ? 'active' : ''}`}
                  onClick={() => handleACMode('cool')}
                  disabled={!acState.power || isSending}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11H17.83L21.07 7.76C21.46 7.37 21.46 6.74 21.07 6.35L17.66 2.93C17.27 2.54 16.64 2.54 16.24 2.93L12 7.17L7.76 2.93C7.37 2.54 6.73 2.54 6.34 2.93L2.93 6.35C2.54 6.74 2.54 7.37 2.93 7.76L6.17 11H2V13H6.17L2.93 16.24C2.54 16.63 2.54 17.26 2.93 17.65L6.34 21.07C6.74 21.46 7.37 21.46 7.76 21.07L12 16.83L16.24 21.07C16.64 21.46 17.27 21.46 17.66 21.07L21.07 17.65C21.46 17.26 21.46 16.63 21.07 16.24L17.83 13H22V11Z" fill="currentColor"/>
                  </svg>
                  Dingin
                </button>
                <button 
                  className={`mode-btn ${acState.mode === 'heat' ? 'active' : ''}`}
                  onClick={() => handleACMode('heat')}
                  disabled={!acState.power || isSending}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12.9L9.55 9.5L7.38 12.6C5.94 14.62 6.41 17.47 8.43 18.91C10.45 20.35 13.3 19.88 14.74 17.86C15.95 16.18 15.74 13.88 14.31 12.46L12 12.9Z" fill="currentColor"/>
                  </svg>
                  Panas
                </button>
                <button 
                  className={`mode-btn ${acState.mode === 'fan' ? 'active' : ''}`}
                  onClick={() => handleACMode('fan')}
                  disabled={!acState.power || isSending}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12ZM12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="currentColor"/>
                  </svg>
                  Kipas
                </button>
              </div>
            </div>
          </div>

        {/* Light Control Panel */}
        <div className={`control-panel light-panel ${lightState.power ? 'active' : ''}`}>
            <div className="panel-header">
              <h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21C9 21.55 9.45 22 10 22H14C14.55 22 15 21.55 15 21V20H9V21ZM12 2C8.14 2 5 5.14 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.14 15.86 2 12 2Z" fill="currentColor"/>
                </svg>
                Kontrol Lampu
              </h3>
              <button 
                className={`power-btn ${lightState.power ? 'on' : 'off'}`}
                onClick={handleLightPower}
                disabled={isSending}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 3H11V13H13V3ZM17.83 5.17L16.41 6.59C17.99 7.86 19 9.81 19 12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12C5 9.81 6.01 7.86 7.58 6.58L6.17 5.17C4.23 6.82 3 9.26 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 9.26 19.77 6.82 17.83 5.17Z" fill="currentColor"/>
                </svg>
                {lightState.power ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="brightness-control">
              <div className="slider-header">
                <span className="slider-label">Kecerahan</span>
                <span className="slider-value">{lightState.brightness}%</span>
              </div>
              <div className="slider-container">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="slider-icon-left">
                  <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7Z" fill="currentColor" opacity="0.5"/>
                </svg>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={lightState.brightness}
                  onChange={(e) => handleLightBrightness(e.target.value)}
                  disabled={!lightState.power || isSending}
                  className="brightness-slider"
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="slider-icon-right">
                  <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 2L14.39 5.42C13.65 5.15 12.84 5 12 5C11.16 5 10.35 5.15 9.61 5.42L12 2ZM3.34 7L7.5 6.65C6.9 7.16 6.36 7.78 5.94 8.46L3.34 7ZM20.65 7L18.94 10.21C18.78 9.39 18.47 8.62 18.03 7.92L20.65 7ZM12 22L9.59 18.56C10.33 18.83 11.14 19 12 19C12.86 19 13.67 18.83 14.41 18.56L12 22Z" fill="currentColor"/>
                </svg>
              </div>
            </div>

            <div className="color-temp-control">
              <div className="slider-header">
                <span className="slider-label">Warna Cahaya</span>
                <span className="slider-value">{lightState.colorTemperature}K</span>
              </div>
              <div className="slider-container color-temp">
                <span className="color-label warm">Hangat</span>
                <input 
                  type="range"
                  min="2700"
                  max="6500"
                  value={lightState.colorTemperature}
                  onChange={(e) => handleLightColorTemp(e.target.value)}
                  disabled={!lightState.power || isSending}
                  className="color-temp-slider"
                />
                <span className="color-label cool">Dingin</span>
              </div>
              <div className="color-preview">
                <div 
                  className="color-swatch"
                  style={{
                    background: `linear-gradient(90deg, #ff9329 0%, #fff4e0 50%, #cce6ff 100%)`,
                  }}
                >
                  <div 
                    className="color-indicator"
                    style={{
                      left: `${((lightState.colorTemperature - 2700) / 3800) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="preset-buttons">
              <span className="preset-label">Preset:</span>
              <div className="presets">
                <button 
                  className="preset-btn"
                  onClick={() => { handleLightBrightness(30); handleLightColorTemp(2700); }}
                  disabled={!lightState.power || isSending}
                >
                  🌙 Malam
                </button>
                <button 
                  className="preset-btn"
                  onClick={() => { handleLightBrightness(70); handleLightColorTemp(4000); }}
                  disabled={!lightState.power || isSending}
                >
                  📖 Belajar
                </button>
                <button 
                  className="preset-btn"
                  onClick={() => { handleLightBrightness(100); handleLightColorTemp(5500); }}
                  disabled={!lightState.power || isSending}
                >
                  ☀️ Terang
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>Aksi Cepat</h4>
        <div className="action-buttons">
          <button 
            className="action-btn comfort"
            onClick={() => {
              handleACPower(); // Turn on if off
              if (!acState.power) {
                setTimeout(() => {
                  handleACTemperature(24 - acState.targetTemperature);
                  handleACMode('cool');
                }, 100);
              }
              handleLightPower(); // Turn on if off
              if (!lightState.power) {
                setTimeout(() => {
                  handleLightBrightness(70);
                  handleLightColorTemp(4000);
                }, 100);
              }
            }}
            disabled={isSending}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15.88 8.29L10 14.17L8.12 12.29C7.73 11.9 7.1 11.9 6.71 12.29C6.32 12.68 6.32 13.31 6.71 13.7L9.3 16.29C9.69 16.68 10.32 16.68 10.71 16.29L17.3 9.7C17.69 9.31 17.69 8.68 17.3 8.29C16.91 7.9 16.27 7.9 15.88 8.29Z" fill="currentColor"/>
            </svg>
            Mode Nyaman
          </button>
          <button 
            className="action-btn presentation"
            onClick={() => {
              if (!lightState.power) handleLightPower();
              setTimeout(() => {
                handleLightBrightness(40);
                handleLightColorTemp(3000);
              }, 100);
            }}
            disabled={isSending}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 3H3C1.9 3 1 3.9 1 5V17C1 18.1 1.9 19 3 19H8V21H16V19H21C22.1 19 23 18.1 23 17V5C23 3.9 22.1 3 21 3ZM21 17H3V5H21V17Z" fill="currentColor"/>
            </svg>
            Mode Presentasi
          </button>
          <button 
            className="action-btn off"
            onClick={() => {
              if (acState.power) handleACPower();
              if (lightState.power) handleLightPower();
            }}
            disabled={isSending}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M13 3H11V13H13V3ZM17.83 5.17L16.41 6.59C17.99 7.86 19 9.81 19 12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12C5 9.81 6.01 7.86 7.58 6.58L6.17 5.17C4.23 6.82 3 9.26 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 9.26 19.77 6.82 17.83 5.17Z" fill="currentColor"/>
            </svg>
            Matikan Semua
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" fill="currentColor"/>
        </svg>
        <p>
          <strong>Catatan:</strong> Kontrol ini terhubung ke sistem ROS2 melalui ROSBridge WebSocket. 
          Pastikan rosbridge_server berjalan di Ubuntu: <code>ros2 launch rosbridge_server rosbridge_websocket_launch.xml</code>
        </p>
      </div>
    </div>
  );
}
