/**
 * Polling Device Service
 * 
 * Handles device assignment, MQTT connectivity with HiveMQ Cloud,
 * and real-time communication for the polling system.
 */

import { ROS2_CONFIG } from "../config/ros2Topics";
import pollingDevicesData from "../data/polling_devices.json";

// Storage keys
const STORAGE_KEY = "polling_device_assignment";
const DEVICE_HISTORY_KEY = "polling_device_history";

/**
 * Get all available polling devices
 * @returns {Array} List of available devices
 */
export function getAvailableDevices() {
  const assignedDevices = getAllAssignedDevices();
  return pollingDevicesData.devices.filter(
    (device) => !assignedDevices.includes(device.code)
  );
}

/**
 * Get all assigned devices from localStorage (simulating database)
 * @returns {Array} List of assigned device codes
 */
export function getAllAssignedDevices() {
  try {
    const assignments = JSON.parse(localStorage.getItem("all_device_assignments") || "{}");
    return Object.values(assignments);
  } catch {
    return [];
  }
}

/**
 * Get current user's assigned device
 * @param {string} nim - Student NIM
 * @returns {Object|null} Device assignment or null
 */
export function getAssignedDevice(nim) {
  try {
    const assignments = JSON.parse(localStorage.getItem("all_device_assignments") || "{}");
    const deviceCode = assignments[nim];
    
    if (deviceCode) {
      return {
        code: deviceCode,
        assignedAt: localStorage.getItem(`device_assigned_at_${nim}`) || new Date().toISOString(),
        status: "assigned",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Assign a device to a student
 * @param {string} nim - Student NIM
 * @param {string} deviceCode - 4-character device code
 * @returns {Object} Result of assignment
 */
export function assignDevice(nim, deviceCode) {
  try {
    // Validate device code format
    if (!/^[A-Z0-9]{4}$/.test(deviceCode)) {
      return {
        success: false,
        error: "Kode device harus 4 karakter (huruf besar dan angka)",
      };
    }

    // Check if device exists
    const deviceExists = pollingDevicesData.devices.some(
      (d) => d.code === deviceCode
    );
    if (!deviceExists) {
      return {
        success: false,
        error: "Kode device tidak ditemukan dalam sistem",
      };
    }

    // Check if device is already assigned
    const assignments = JSON.parse(localStorage.getItem("all_device_assignments") || "{}");
    const existingOwner = Object.entries(assignments).find(
      ([_, code]) => code === deviceCode
    );
    if (existingOwner && existingOwner[0] !== nim) {
      return {
        success: false,
        error: "Device sudah digunakan oleh mahasiswa lain",
      };
    }

    // Check if student already has a device
    if (assignments[nim]) {
      return {
        success: false,
        error: "Anda sudah memiliki device terdaftar. Reset terlebih dahulu untuk mengganti.",
      };
    }

    // Assign the device
    assignments[nim] = deviceCode;
    localStorage.setItem("all_device_assignments", JSON.stringify(assignments));
    localStorage.setItem(`device_assigned_at_${nim}`, new Date().toISOString());

    // Add to history
    addToHistory(nim, deviceCode, "assigned");

    return {
      success: true,
      device: {
        code: deviceCode,
        assignedAt: new Date().toISOString(),
        status: "assigned",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menyimpan device",
    };
  }
}

/**
 * Reset/unassign a device from student
 * @param {string} nim - Student NIM
 * @returns {Object} Result of reset
 */
export function resetDevice(nim) {
  try {
    const assignments = JSON.parse(localStorage.getItem("all_device_assignments") || "{}");
    const deviceCode = assignments[nim];

    if (!deviceCode) {
      return {
        success: false,
        error: "Tidak ada device yang terdaftar",
      };
    }

    // Remove assignment
    delete assignments[nim];
    localStorage.setItem("all_device_assignments", JSON.stringify(assignments));
    localStorage.removeItem(`device_assigned_at_${nim}`);

    // Add to history
    addToHistory(nim, deviceCode, "reset");

    return {
      success: true,
      message: "Device berhasil di-reset",
    };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat reset device",
    };
  }
}

/**
 * Add device action to history
 * @param {string} nim - Student NIM
 * @param {string} deviceCode - Device code
 * @param {string} action - Action type (assigned/reset)
 */
function addToHistory(nim, deviceCode, action) {
  try {
    const history = JSON.parse(localStorage.getItem(DEVICE_HISTORY_KEY) || "[]");
    history.unshift({
      nim,
      deviceCode,
      action,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 100 entries
    localStorage.setItem(DEVICE_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch {
    // Ignore history errors
  }
}

/**
 * Get device history for a student
 * @param {string} nim - Student NIM
 * @returns {Array} Device history
 */
export function getDeviceHistory(nim) {
  try {
    const history = JSON.parse(localStorage.getItem(DEVICE_HISTORY_KEY) || "[]");
    return history.filter((h) => h.nim === nim);
  } catch {
    return [];
  }
}

/**
 * Validate device code format
 * @param {string} code - Device code to validate
 * @returns {boolean} True if valid
 */
export function isValidDeviceCode(code) {
  return /^[A-Z0-9]{4}$/.test(code);
}

// ============================================
// MQTT Service for HiveMQ Cloud Connection
// ============================================

let mqttClient = null;
let connectionStatus = "disconnected";
let messageCallbacks = new Map();

/**
 * Initialize MQTT connection to HiveMQ Cloud
 * @param {Object} options - Connection options
 * @returns {Promise} Connection promise
 */
export async function initializeMQTT(options = {}) {
  // This will use the Paho MQTT client or similar
  // For now, we'll use a mock implementation
  
  const config = {
    ...ROS2_CONFIG.mqtt,
    ...options,
  };

  return new Promise((resolve, reject) => {
    try {
      // In production, use actual MQTT library
      // import Paho from 'paho-mqtt';
      
      console.log("Connecting to MQTT broker:", config.broker);
      
      // Simulate connection for now
      connectionStatus = "connecting";
      
      setTimeout(() => {
        connectionStatus = "connected";
        console.log("MQTT connected successfully");
        resolve({ status: "connected" });
      }, 1000);
      
    } catch (error) {
      connectionStatus = "error";
      reject(error);
    }
  });
}

/**
 * Get current MQTT connection status
 * @returns {string} Connection status
 */
export function getMQTTStatus() {
  return connectionStatus;
}

/**
 * Subscribe to a topic
 * @param {string} topic - Topic to subscribe
 * @param {Function} callback - Message callback
 */
export function subscribeTopic(topic, callback) {
  messageCallbacks.set(topic, callback);
  console.log(`Subscribed to topic: ${topic}`);
}

/**
 * Unsubscribe from a topic
 * @param {string} topic - Topic to unsubscribe
 */
export function unsubscribeTopic(topic) {
  messageCallbacks.delete(topic);
  console.log(`Unsubscribed from topic: ${topic}`);
}

/**
 * Publish message to a topic
 * @param {string} topic - Topic to publish to
 * @param {Object} message - Message payload
 */
export function publishMessage(topic, message) {
  console.log(`Publishing to ${topic}:`, message);
  // In production, use actual MQTT publish
}

/**
 * Disconnect MQTT client
 */
export function disconnectMQTT() {
  if (mqttClient) {
    // mqttClient.disconnect();
    mqttClient = null;
  }
  connectionStatus = "disconnected";
  messageCallbacks.clear();
  console.log("MQTT disconnected");
}

// ============================================
// Polling Session Management
// ============================================

let currentPollingSession = null;
let lastAnswer = null;

/**
 * Get current active polling session
 * @returns {Object|null} Current session or null
 */
export function getCurrentPollingSession() {
  return currentPollingSession;
}

/**
 * Submit an answer for the current polling
 * @param {string} deviceCode - Device code
 * @param {string} answer - Answer (A, B, C, D, or E)
 * @returns {Object} Submission result
 */
export function submitAnswer(deviceCode, answer) {
  const validAnswers = ["A", "B", "C", "D", "E"];
  
  if (!validAnswers.includes(answer.toUpperCase())) {
    return {
      success: false,
      error: "Jawaban tidak valid. Gunakan A, B, C, D, atau E",
    };
  }

  lastAnswer = {
    deviceCode,
    answer: answer.toUpperCase(),
    timestamp: new Date().toISOString(),
    status: "submitted",
  };

  // Publish to MQTT topic
  publishMessage(ROS2_CONFIG.topics.polling.answer, {
    device_code: deviceCode,
    answer: answer.toUpperCase(),
    timestamp: Date.now(),
  });

  return {
    success: true,
    answer: lastAnswer,
  };
}

/**
 * Get the last submitted answer
 * @returns {Object|null} Last answer or null
 */
export function getLastAnswer() {
  return lastAnswer;
}

/**
 * Clear the last answer
 */
export function clearLastAnswer() {
  lastAnswer = null;
}

// ============================================
// Simulated Real-time Updates (for demo)
// ============================================

let simulationInterval = null;

/**
 * Start simulated device updates (for demo purposes)
 * @param {string} deviceCode - Device code to simulate
 * @param {Function} onUpdate - Callback for updates
 */
export function startDeviceSimulation(deviceCode, onUpdate) {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  // Simulate device heartbeat and status updates
  simulationInterval = setInterval(() => {
    const status = {
      deviceCode,
      status: "online",
      batteryLevel: Math.floor(Math.random() * 30) + 70, // 70-100%
      lastSeen: new Date().toISOString(),
      signalStrength: Math.floor(Math.random() * 30) + 70, // 70-100%
    };
    onUpdate(status);
  }, 5000);

  // Return cleanup function
  return () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  };
}

/**
 * Stop device simulation
 */
export function stopDeviceSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

export default {
  getAvailableDevices,
  getAssignedDevice,
  assignDevice,
  resetDevice,
  getDeviceHistory,
  isValidDeviceCode,
  initializeMQTT,
  getMQTTStatus,
  subscribeTopic,
  unsubscribeTopic,
  publishMessage,
  disconnectMQTT,
  getCurrentPollingSession,
  submitAnswer,
  getLastAnswer,
  clearLastAnswer,
  startDeviceSimulation,
  stopDeviceSimulation,
};
