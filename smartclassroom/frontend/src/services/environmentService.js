/**
 * Service untuk manajemen sensor dan aktuator suhu & cahaya dengan integrasi ROS2
 * 
 * ROS2 Topic Integration:
 * - SUBSCRIBE: /ILUMINATIONS_AND_TEMPERATURE - Menerima data sensor dari ESP32
 *   Format: "ID: ESP32-Rodrick | Lux: 99.17 | Temp: 24.45"
 * 
 * - PUBLISH (Actuator Commands):
 *   - /smartclassroom/actuator/ac/command - Kontrol AC (temperature)
 *   - /smartclassroom/actuator/light/command - Kontrol Lampu (dimmer/on-off)
 * 
 * Arsitektur:
 * ┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
 * │   ESP32 Sensor  │  ROS2   │   ROSBridge      │  WS     │   React Frontend    │
 * │   (Temp & Lux)  │ ───────>│   WebSocket      │ ───────>│   (Dashboard)       │
 * │                 │         │   (Port 9090)    │         │                     │
 * └─────────────────┘         └──────────────────┘         └─────────────────────┘
 *                                     ▲
 * ┌─────────────────┐                 │
 * │   Actuators     │  ROS2           │
 * │   (AC, Lights)  │ <───────────────┘
 * └─────────────────┘
 */

// ==========================================
// ROS2 CONFIGURATION
// ==========================================

export const ROS2_ENVIRONMENT_CONFIG = {
  // ROSBridge WebSocket Configuration
  rosbridge: {
    // Default URL - can be overridden via localStorage or environment variable
    url: process.env.REACT_APP_ROS_BRIDGE_URL || process.env.REACT_APP_ROSBRIDGE_URL || 'ws://10.41.197.10:9090',
    reconnectInterval: 3000, // ms
    maxReconnectAttempts: 10,
  },

  // ROS2 Topic Definitions
  topics: {
    // Sensor data topic (SUBSCRIBE)
    sensor: {
      illuminationAndTemperature: '/ILUMINATIONS_AND_TEMPERATURE',
      messageType: 'std_msgs/msg/String',
    },

    // Actuator command topics (PUBLISH)
    actuator: {
      acCommand: '/smartclassroom/actuator/ac/command',
      lightCommand: '/smartclassroom/actuator/light/command',
      acStatus: '/smartclassroom/actuator/ac/status',
      lightStatus: '/smartclassroom/actuator/light/status',
      messageType: 'std_msgs/msg/String',
    },
  },

  // Message format for actuators
  messageFormats: {
    acCommand: {
      device_id: 'string',      // e.g., "AC-Room701"
      action: 'string',         // "set_temp" | "power" | "mode"
      value: 'number|string',   // temperature value or "on"/"off" or "cool"/"heat"/"fan"
      timestamp: 'number',
    },
    lightCommand: {
      device_id: 'string',      // e.g., "LIGHT-Room701"
      action: 'string',         // "brightness" | "power" | "color_temp"
      value: 'number|string',   // 0-100 brightness, "on"/"off", or kelvin value
      timestamp: 'number',
    },
  },
};

// ==========================================
// STATE MANAGEMENT
// ==========================================

// Current sensor data
let currentSensorData = {
  temperature: null,
  lux: null,
  deviceId: null,
  lastUpdate: null,
  isConnected: false,
};

// Actuator states
let actuatorStates = {
  ac: {
    power: false,
    targetTemperature: 24,
    mode: 'cool', // cool, heat, fan
    lastCommand: null,
  },
  light: {
    power: false,
    brightness: 100, // 0-100
    colorTemperature: 4000, // Kelvin (2700-6500)
    lastCommand: null,
  },
};

// ROS2 connection state
let ros2Connection = null;
let sensorSubscriber = null;
let reconnectAttempts = 0;
let reconnectTimer = null;

// Callbacks for UI updates
let sensorUpdateCallbacks = [];
let connectionStatusCallbacks = [];
let actuatorStatusCallbacks = [];

// ==========================================
// DATA PARSING
// ==========================================

/**
 * Parse sensor data from ROS2 topic message
 * Format: "ID: ESP32-Rodrick | Lux: 99.17 | Temp: 24.45"
 * 
 * @param {string} messageData - Raw message string from ROS2
 * @returns {object|null} Parsed sensor data or null if parsing fails
 */
export function parseSensorMessage(messageData) {
  try {
    // Match pattern: ID: {deviceId} | Lux: {lux} | Temp: {temp}
    const pattern = /ID:\s*([^\|]+)\s*\|\s*Lux:\s*([\d.]+)\s*\|\s*Temp:\s*([\d.]+)/i;
    const match = messageData.match(pattern);

    if (!match) {
      console.warn('⚠️ Could not parse sensor message:', messageData);
      return null;
    }

    const parsed = {
      deviceId: match[1].trim(),
      lux: parseFloat(match[2]),
      temperature: parseFloat(match[3]),
      timestamp: Date.now(),
      raw: messageData,
    };

    console.log('📊 Parsed sensor data:', parsed);
    return parsed;

  } catch (error) {
    console.error('❌ Error parsing sensor message:', error);
    return null;
  }
}

// ==========================================
// ROS2 CONNECTION MANAGEMENT
// ==========================================

/**
 * Get ROSBridge URL from configuration
 * Priority: localStorage > environment variable > default
 */
export function getRosbridgeUrl() {
  const savedUrl = localStorage.getItem('rosbridge_url');
  if (savedUrl) return savedUrl;
  return ROS2_ENVIRONMENT_CONFIG.rosbridge.url;
}

/**
 * Set custom ROSBridge URL
 * @param {string} url - WebSocket URL for ROSBridge
 */
export function setRosbridgeUrl(url) {
  localStorage.setItem('rosbridge_url', url);
  console.log('✅ ROSBridge URL updated:', url);
}

/**
 * Initialize ROS2 connection for environment sensors
 * Uses roslibjs to connect to ROSBridge WebSocket
 * 
 * @param {Function} onSensorUpdate - Callback when sensor data is received
 * @param {Function} onConnectionChange - Callback when connection status changes
 * @returns {object} Connection control object
 */
export function initEnvironmentROS2(onSensorUpdate, onConnectionChange) {
  // Add callbacks
  if (onSensorUpdate) {
    sensorUpdateCallbacks.push(onSensorUpdate);
  }
  if (onConnectionChange) {
    connectionStatusCallbacks.push(onConnectionChange);
  }

  // If already connected, just add the callbacks
  if (ros2Connection && currentSensorData.isConnected) {
    if (onConnectionChange) {
      onConnectionChange({ connected: true, url: getRosbridgeUrl() });
    }
    // Send current data immediately
    if (onSensorUpdate && currentSensorData.temperature !== null) {
      onSensorUpdate(currentSensorData);
    }
    return createConnectionController(onSensorUpdate, onConnectionChange);
  }

  // Connect to ROSBridge
  connectToRosbridge();

  return createConnectionController(onSensorUpdate, onConnectionChange);
}

/**
 * Create connection controller object
 */
function createConnectionController(onSensorUpdate, onConnectionChange) {
  return {
    disconnect: () => {
      // Remove callbacks
      sensorUpdateCallbacks = sensorUpdateCallbacks.filter(cb => cb !== onSensorUpdate);
      connectionStatusCallbacks = connectionStatusCallbacks.filter(cb => cb !== onConnectionChange);

      // If no more listeners, disconnect
      if (sensorUpdateCallbacks.length === 0 && connectionStatusCallbacks.length === 0) {
        disconnectFromRosbridge();
      }
    },
    reconnect: () => {
      disconnectFromRosbridge();
      setTimeout(() => connectToRosbridge(), 500);
    },
    getCurrentData: () => ({ ...currentSensorData }),
    isConnected: () => currentSensorData.isConnected,
  };
}

/**
 * Connect to ROSBridge WebSocket
 * 
 * NOTE: Untuk implementasi nyata, uncomment kode ROSLIB dan install:
 * npm install roslib
 */
function connectToRosbridge() {
  const url = getRosbridgeUrl();
  console.log('🔌 Connecting to ROSBridge:', url);

  // Notify connecting status
  notifyConnectionStatus({ connected: false, connecting: true, url });

  /*
  // ============================================
  // ACTUAL ROSLIB IMPLEMENTATION
  // Uncomment this when roslib is installed
  // ============================================
  
  import ROSLIB from 'roslib';

  ros2Connection = new ROSLIB.Ros({ url });

  ros2Connection.on('connection', () => {
    console.log('✅ Connected to ROSBridge');
    currentSensorData.isConnected = true;
    reconnectAttempts = 0;
    notifyConnectionStatus({ connected: true, url });
    subscribeToSensorTopic();
  });

  ros2Connection.on('error', (error) => {
    console.error('❌ ROSBridge connection error:', error);
    notifyConnectionStatus({ connected: false, error: error.message, url });
  });

  ros2Connection.on('close', () => {
    console.log('🔌 ROSBridge connection closed');
    currentSensorData.isConnected = false;
    notifyConnectionStatus({ connected: false, url });
    scheduleReconnect();
  });
  */

  // ============================================
  // PLACEHOLDER IMPLEMENTATION (for development)
  // Simulates ROS2 connection with mock data
  // ============================================
  
  // Simulate connection delay
  setTimeout(() => {
    console.log('✅ [SIMULATED] Connected to ROSBridge');
    currentSensorData.isConnected = true;
    reconnectAttempts = 0;
    notifyConnectionStatus({ connected: true, url, simulated: true });

    // Start simulated sensor data
    startSimulatedSensorData();
  }, 1000);
}

/**
 * Subscribe to sensor topic
 */
function subscribeToSensorTopic() {
  /*
  // ACTUAL ROSLIB IMPLEMENTATION
  const topicConfig = ROS2_ENVIRONMENT_CONFIG.topics.sensor;
  
  sensorSubscriber = new ROSLIB.Topic({
    ros: ros2Connection,
    name: topicConfig.illuminationAndTemperature,
    messageType: topicConfig.messageType,
  });

  sensorSubscriber.subscribe((message) => {
    const parsed = parseSensorMessage(message.data);
    if (parsed) {
      updateSensorData(parsed);
    }
  });

  console.log('📡 Subscribed to:', topicConfig.illuminationAndTemperature);
  */
}

/**
 * Update sensor data and notify listeners
 */
function updateSensorData(parsed) {
  currentSensorData = {
    temperature: parsed.temperature,
    lux: parsed.lux,
    deviceId: parsed.deviceId,
    lastUpdate: parsed.timestamp,
    isConnected: true,
  };

  // Notify all listeners
  sensorUpdateCallbacks.forEach(callback => {
    try {
      callback(currentSensorData);
    } catch (error) {
      console.error('Error in sensor callback:', error);
    }
  });
}

/**
 * Notify connection status change
 */
function notifyConnectionStatus(status) {
  connectionStatusCallbacks.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('Error in connection callback:', error);
    }
  });
}

/**
 * Schedule reconnection attempt
 */
function scheduleReconnect() {
  const config = ROS2_ENVIRONMENT_CONFIG.rosbridge;
  
  if (reconnectAttempts >= config.maxReconnectAttempts) {
    console.error('❌ Max reconnect attempts reached');
    notifyConnectionStatus({ 
      connected: false, 
      error: 'Max reconnect attempts reached',
      url: getRosbridgeUrl(),
    });
    return;
  }

  reconnectAttempts++;
  console.log(`🔄 Scheduling reconnect attempt ${reconnectAttempts}/${config.maxReconnectAttempts}`);

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(() => {
    connectToRosbridge();
  }, config.reconnectInterval);
}

/**
 * Disconnect from ROSBridge
 */
function disconnectFromRosbridge() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (sensorSubscriber) {
    // sensorSubscriber.unsubscribe(); // ROSLIB
    sensorSubscriber = null;
  }

  if (ros2Connection) {
    // ros2Connection.close(); // ROSLIB
    ros2Connection = null;
  }

  // Stop simulation
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }

  currentSensorData.isConnected = false;
  notifyConnectionStatus({ connected: false, url: getRosbridgeUrl() });
  console.log('🔌 Disconnected from ROSBridge');
}

// ==========================================
// ACTUATOR COMMANDS
// ==========================================

/**
 * Send AC command to ROS2
 * 
 * @param {object} command - AC command object
 * @param {string} command.action - "set_temp" | "power" | "mode"
 * @param {number|string} command.value - Temperature value or power state
 * @param {string} [command.deviceId] - Device ID (optional)
 */
export function sendACCommand(command) {
  const message = {
    device_id: command.deviceId || `AC-Room${getSelectedClassroom()}`,
    action: command.action,
    value: command.value,
    timestamp: Date.now(),
  };

  console.log('🌡️ Sending AC command:', message);

  // Update local state
  if (command.action === 'power') {
    actuatorStates.ac.power = command.value === 'on';
  } else if (command.action === 'set_temp') {
    actuatorStates.ac.targetTemperature = command.value;
  } else if (command.action === 'mode') {
    actuatorStates.ac.mode = command.value;
  }
  actuatorStates.ac.lastCommand = message;

  // Notify listeners
  notifyActuatorStatus('ac', actuatorStates.ac);

  /*
  // ACTUAL ROSLIB IMPLEMENTATION
  if (!ros2Connection || !currentSensorData.isConnected) {
    console.error('❌ Not connected to ROSBridge');
    return false;
  }

  const topic = new ROSLIB.Topic({
    ros: ros2Connection,
    name: ROS2_ENVIRONMENT_CONFIG.topics.actuator.acCommand,
    messageType: ROS2_ENVIRONMENT_CONFIG.topics.actuator.messageType,
  });

  const rosMessage = new ROSLIB.Message({
    data: JSON.stringify(message),
  });

  topic.publish(rosMessage);
  console.log('✅ AC command published');
  */

  return true;
}

/**
 * Send Light command to ROS2
 * 
 * @param {object} command - Light command object
 * @param {string} command.action - "brightness" | "power" | "color_temp"
 * @param {number|string} command.value - Brightness (0-100), power state, or kelvin
 * @param {string} [command.deviceId] - Device ID (optional)
 */
export function sendLightCommand(command) {
  const message = {
    device_id: command.deviceId || `LIGHT-Room${getSelectedClassroom()}`,
    action: command.action,
    value: command.value,
    timestamp: Date.now(),
  };

  console.log('💡 Sending Light command:', message);

  // Update local state
  if (command.action === 'power') {
    actuatorStates.light.power = command.value === 'on';
  } else if (command.action === 'brightness') {
    actuatorStates.light.brightness = command.value;
  } else if (command.action === 'color_temp') {
    actuatorStates.light.colorTemperature = command.value;
  }
  actuatorStates.light.lastCommand = message;

  // Notify listeners
  notifyActuatorStatus('light', actuatorStates.light);

  /*
  // ACTUAL ROSLIB IMPLEMENTATION
  if (!ros2Connection || !currentSensorData.isConnected) {
    console.error('❌ Not connected to ROSBridge');
    return false;
  }

  const topic = new ROSLIB.Topic({
    ros: ros2Connection,
    name: ROS2_ENVIRONMENT_CONFIG.topics.actuator.lightCommand,
    messageType: ROS2_ENVIRONMENT_CONFIG.topics.actuator.messageType,
  });

  const rosMessage = new ROSLIB.Message({
    data: JSON.stringify(message),
  });

  topic.publish(rosMessage);
  console.log('✅ Light command published');
  */

  return true;
}

/**
 * Register callback for actuator status updates
 */
export function onActuatorStatusChange(callback) {
  actuatorStatusCallbacks.push(callback);
  
  // Send current states immediately
  callback('ac', actuatorStates.ac);
  callback('light', actuatorStates.light);

  return () => {
    actuatorStatusCallbacks = actuatorStatusCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Notify actuator status change
 */
function notifyActuatorStatus(type, state) {
  actuatorStatusCallbacks.forEach(callback => {
    try {
      callback(type, state);
    } catch (error) {
      console.error('Error in actuator callback:', error);
    }
  });
}

/**
 * Get current actuator states
 */
export function getActuatorStates() {
  return { ...actuatorStates };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get currently selected classroom from session
 */
function getSelectedClassroom() {
  // Try to get from URL or default to 701
  const path = window.location.pathname;
  const match = path.match(/\/classoverview\/(\d+)/);
  return match ? match[1] : '701';
}

/**
 * Get current sensor data
 */
export function getCurrentSensorData() {
  return { ...currentSensorData };
}

/**
 * Check if connected to ROS2
 */
export function isROS2Connected() {
  return currentSensorData.isConnected;
}

// ==========================================
// SIMULATION (for development without ROS2)
// ==========================================

let simulationInterval = null;

/**
 * Start simulated sensor data (for development)
 */
function startSimulatedSensorData() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  // Initial data
  const simulateData = () => {
    const parsed = {
      deviceId: 'ESP32-Rodrick',
      temperature: 22 + Math.random() * 6, // 22-28°C
      lux: 80 + Math.random() * 40, // 80-120 Lux
      timestamp: Date.now(),
    };
    updateSensorData(parsed);
  };

  // Immediate first update
  simulateData();

  // Update every 3 seconds
  simulationInterval = setInterval(simulateData, 3000);
  console.log('🎭 Started simulated sensor data');
}

/**
 * Manual simulation trigger (for testing)
 */
export function simulateSensorData(data) {
  const parsed = parseSensorMessage(data);
  if (parsed) {
    updateSensorData(parsed);
  }
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  // Configuration
  ROS2_ENVIRONMENT_CONFIG,
  getRosbridgeUrl,
  setRosbridgeUrl,

  // Connection
  initEnvironmentROS2,
  isROS2Connected,
  getCurrentSensorData,

  // Actuators
  sendACCommand,
  sendLightCommand,
  getActuatorStates,
  onActuatorStatusChange,

  // Utilities
  parseSensorMessage,
  simulateSensorData,
};
