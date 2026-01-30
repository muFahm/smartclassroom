/**
 * Polling Device Service
 * 
 * Handles device assignment, MQTT connectivity with HiveMQ Cloud,
 * and real-time communication for the polling system.
 */

import ROSLIB from "roslib";
import { ROS2_CONFIG } from "../config/ros2Topics";
import { getRosbridgeUrl } from "./environmentService";
import pollingDevicesData from "../data/polling_devices.json";

// Storage keys
const STORAGE_KEY = "polling_device_assignment";
const DEVICE_HISTORY_KEY = "polling_device_history";

const POLLING_RESPONSE_TOPIC =
  process.env.REACT_APP_POLLING_RESPONSE_TOPIC || ROS2_CONFIG.topics.polling.answer;
const POLLING_RESPONSE_MSG_TYPE =
  process.env.REACT_APP_POLLING_RESPONSE_MSG_TYPE || "std_msgs/msg/String";
const DEVICE_ACTIVITY_TTL_MS = 5 * 60 * 1000;

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
 * Get all device assignments (nim -> deviceCode)
 * @returns {Object} Assignment map
 */
export function getAllDeviceAssignments() {
  try {
    return JSON.parse(localStorage.getItem("all_device_assignments") || "{}");
  } catch {
    return {};
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

// ============================================
// Device Heartbeat Tracking (ROS2-ready)
// ============================================

const HEARTBEAT_TTL_MS = 45_000; // 3x 15s interval from device firmware
let heartbeatTimer = null;
const heartbeatStatusMap = new Map(); // deviceCode -> status
const heartbeatSubscribers = new Set();

// ============================================
// Polling Response Activity Tracking (ROSBridge)
// ============================================

let pollingRos = null;
let pollingTopic = null;
const pollingResponseSubscribers = new Set();
const pollingStatusSubscribers = new Set();
const deviceActivityMap = new Map();
let activityTimer = null;

function normalizePollingTimestamp(value) {
  if (!value) return Date.now();
  const num = Number(value);
  if (Number.isNaN(num)) return Date.now();
  return num < 1e12 ? num * 1000 : num;
}

function normalizePollingPayload(payload = {}) {
  const deviceRaw = payload.device_id || payload.deviceCode || payload.device_code || "";
  const deviceCode = String(deviceRaw).trim().toUpperCase();
  if (!deviceCode) return null;

  const nim = payload.nim || payload.student_nim || payload.studentId || null;
  const name = payload.nama || payload.name || payload.student_name || null;
  const response = payload.response || payload.answer || payload.choice || null;
  const timestamp = normalizePollingTimestamp(payload.timestamp || payload.ts || payload.time);

  return {
    deviceCode,
    nim: nim ? String(nim) : null,
    name: name ? String(name) : null,
    response: response ? String(response).toUpperCase() : null,
    timestamp,
    raw: payload,
  };
}

function notifyPollingStatus(status) {
  pollingStatusSubscribers.forEach((callback) => {
    try {
      callback(status);
    } catch {
      // ignore
    }
  });
}

function notifyPollingResponses(entry) {
  pollingResponseSubscribers.forEach((callback) => {
    try {
      callback(entry);
    } catch {
      // ignore
    }
  });
}

function updateDeviceActivity(entry) {
  if (!entry?.deviceCode) return;
  deviceActivityMap.set(entry.deviceCode, {
    deviceCode: entry.deviceCode,
    status: "online",
    lastSeen: entry.timestamp || Date.now(),
    nim: entry.nim || null,
    name: entry.name || null,
    lastResponse: entry.response || null,
    raw: entry.raw || {},
  });
}

function refreshDeviceActivity() {
  const now = Date.now();
  let changed = false;
  deviceActivityMap.forEach((status, code) => {
    const isOnline = status.lastSeen && now - status.lastSeen <= DEVICE_ACTIVITY_TTL_MS;
    if (status.status === "online" && !isOnline) {
      deviceActivityMap.set(code, { ...status, status: "offline" });
      changed = true;
    }
  });
  if (changed) {
    deviceActivitySubscribers.forEach((callback) => {
      try {
        callback(new Map(deviceActivityMap));
      } catch {
        // ignore
      }
    });
  }
}

function ensureActivityTimer() {
  if (activityTimer) return;
  activityTimer = setInterval(refreshDeviceActivity, 15000);
}

const deviceActivitySubscribers = new Set();

export function subscribeDeviceActivity(callback) {
  deviceActivitySubscribers.add(callback);
  ensureActivityTimer();
  callback(new Map(deviceActivityMap));

  return () => {
    deviceActivitySubscribers.delete(callback);
    if (deviceActivitySubscribers.size === 0 && activityTimer) {
      clearInterval(activityTimer);
      activityTimer = null;
    }
  };
}

export function getDeviceActivitySnapshot() {
  return new Map(deviceActivityMap);
}

export function initPollingResponseBridge(onResponse, onStatus) {
  if (onResponse) pollingResponseSubscribers.add(onResponse);
  if (onStatus) pollingStatusSubscribers.add(onStatus);

  if (!pollingRos) {
    const url = getRosbridgeUrl();
    pollingRos = new ROSLIB.Ros({ url });

    pollingRos.on("connection", () => {
      notifyPollingStatus({ connected: true, url });
    });

    pollingRos.on("error", (error) => {
      notifyPollingStatus({ connected: false, url, error });
    });

    pollingRos.on("close", () => {
      notifyPollingStatus({ connected: false, url });
    });

    pollingTopic = new ROSLIB.Topic({
      ros: pollingRos,
      name: POLLING_RESPONSE_TOPIC,
      messageType: POLLING_RESPONSE_MSG_TYPE,
    });

    pollingTopic.subscribe((message) => {
      let payload = message;
      try {
        if (message?.data && typeof message.data === "string") {
          payload = JSON.parse(message.data);
        }
      } catch {
        payload = message;
      }

      const normalized = normalizePollingPayload(payload);
      if (!normalized) return;

      updateDeviceActivity(normalized);
      deviceActivitySubscribers.forEach((callback) => {
        try {
          callback(new Map(deviceActivityMap));
        } catch {
          // ignore
        }
      });
      notifyPollingResponses(normalized);
    });
  }

  return {
    disconnect: () => {
      if (onResponse) pollingResponseSubscribers.delete(onResponse);
      if (onStatus) pollingStatusSubscribers.delete(onStatus);

      if (
        pollingResponseSubscribers.size === 0 &&
        pollingStatusSubscribers.size === 0 &&
        pollingRos
      ) {
        try {
          pollingTopic?.unsubscribe();
        } catch {
          // ignore
        }
        try {
          pollingRos.close();
        } catch {
          // ignore
        }
        pollingRos = null;
        pollingTopic = null;
      }
    },
  };
}

export function subscribePollingResponses(callback) {
  pollingResponseSubscribers.add(callback);
  return () => pollingResponseSubscribers.delete(callback);
}

function normalizeDeviceCode(payload = {}) {
  const raw = payload.device_code || payload.device_id || "";
  const code = String(raw).trim().toUpperCase();
  return code.length === 4 ? code : "";
}

function notifyHeartbeatSubscribers() {
  const snapshot = getDeviceHeartbeatSnapshot();
  heartbeatSubscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch {
      // ignore subscriber error
    }
  });
}

function updateHeartbeatStatus(payload = {}) {
  const code = normalizeDeviceCode(payload);
  if (!code) return;

  heartbeatStatusMap.set(code, {
    deviceCode: code,
    status: "online",
    batteryLevel: payload.battery_level ?? payload.batteryLevel ?? null,
    rssi: payload.rssi ?? null,
    lastSeen: Date.now(),
    raw: payload,
  });

  notifyHeartbeatSubscribers();
}

function refreshHeartbeatStatuses() {
  const now = Date.now();
  let changed = false;
  heartbeatStatusMap.forEach((status, code) => {
    const isOnline = status.lastSeen && now - status.lastSeen <= HEARTBEAT_TTL_MS;
    if (status.status === "online" && !isOnline) {
      heartbeatStatusMap.set(code, {
        ...status,
        status: "offline",
      });
      changed = true;
    }
  });
  if (changed) {
    notifyHeartbeatSubscribers();
  }
}

function ensureHeartbeatTimer() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(refreshHeartbeatStatuses, 5000);
}

/**
 * Public: push heartbeat payload from ROS2/MQTT bridge
 * Payload example (ESP32): { type:"heartbeat", device_id:"A1B2", rssi:-55, ts:123 }
 */
export function handleDeviceHeartbeat(payload) {
  updateHeartbeatStatus(payload);
}

/**
 * Initialize ROS2 heartbeat bridge (placeholder - to be wired when topic ready)
 * This function is intentionally a no-op until ROS2 topic is finalized.
 */
export function initializeDeviceHeartbeatBridge() {
  // TODO: connect to ROS2 topic ROS2_CONFIG.topics.device.heartbeat
  // and call handleDeviceHeartbeat(message)
}

/**
 * Subscribe to device heartbeat updates
 * @param {(snapshot: Map) => void} callback
 */
export function subscribeDeviceHeartbeats(callback) {
  heartbeatSubscribers.add(callback);
  ensureHeartbeatTimer();
  callback(getDeviceHeartbeatSnapshot());

  return () => {
    heartbeatSubscribers.delete(callback);
    if (heartbeatSubscribers.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };
}

/**
 * Get current heartbeat snapshot map
 * @returns {Map<string, object>}
 */
export function getDeviceHeartbeatSnapshot() {
  return new Map(heartbeatStatusMap);
}

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
  handleDeviceHeartbeat,
  subscribeDeviceHeartbeats,
  getDeviceHeartbeatSnapshot,
  initializeDeviceHeartbeatBridge,
  initPollingResponseBridge,
  subscribePollingResponses,
  subscribeDeviceActivity,
  getDeviceActivitySnapshot,
};
