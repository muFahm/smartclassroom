/**
 * ROS2 Topic Configuration for Smart Classroom Polling System
 * 
 * This configuration file defines the ROS2 topics used for communication
 * between ESP32 polling devices and the ROS2 system running on Ubuntu.
 * 
 * Architecture:
 * ESP32 -> HiveMQ MQTT Cloud -> MQTT-ROS2 Bridge -> ROS2 Topics -> Smart Classroom Backend
 */

export const ROS2_CONFIG = {
  // HiveMQ Cloud Configuration
  mqtt: {
    broker: "cbf47bba78db4ab89835161279541b19.s1.eu.hivemq.cloud", // e.g., "broker.hivemq.cloud"
    port: 8883, // TLS port
    wsPort: 8884, // WebSocket Secure port
    username: "Capstone26",
    password: "Capstone26",
    clientIdPrefix: "smartclassroom_",
    useTLS: true,
  },

  // ROS2 Topic Definitions
  // Format: /smartclassroom/{category}/{specific_topic}
  topics: {
    // Device Management Topics
    device: {
      // Device registration and status
      register: "/smartclassroom/device/register",
      status: "/smartclassroom/device/status",
      heartbeat: "/smartclassroom/device/heartbeat",
      disconnect: "/smartclassroom/device/disconnect",
    },

    // Polling/Quiz Topics
    polling: {
      // Quiz session management
      sessionStart: "/smartclassroom/polling/session/start",
      sessionEnd: "/smartclassroom/polling/session/end",
      question: "/smartclassroom/polling/question",
      
      // Answer submissions
      answer: "/smartclassroom/polling/answer",
      answerConfirm: "/smartclassroom/polling/answer/confirm",
      
      // Results
      result: "/smartclassroom/polling/result",
      statistics: "/smartclassroom/polling/statistics",
    },

    // Student Topics
    student: {
      // Student-specific channels (will append /{nim})
      base: "/smartclassroom/student",
      device: "/smartclassroom/student/device",
      response: "/smartclassroom/student/response",
    },

    // Classroom Topics
    classroom: {
      // Classroom-specific channels (will append /{room_id})
      base: "/smartclassroom/classroom",
      announcement: "/smartclassroom/classroom/announcement",
      activeQuiz: "/smartclassroom/classroom/quiz/active",
    },
  },

  // Message Types (for message structure reference)
  messageTypes: {
    deviceRegister: {
      device_code: "string", // 4-char code e.g., "A1B2"
      student_nim: "string", // 12-digit NIM
      timestamp: "number",   // Unix timestamp
    },
    deviceStatus: {
      device_code: "string",
      status: "string", // "online" | "offline" | "busy"
      battery_level: "number", // 0-100
      timestamp: "number",
    },
    pollingAnswer: {
      device_code: "string",
      student_nim: "string",
      quiz_id: "string",
      question_id: "string",
      answer: "string", // "A" | "B" | "C" | "D" | "E"
      timestamp: "number",
    },
    answerConfirm: {
      device_code: "string",
      quiz_id: "string",
      question_id: "string",
      status: "string", // "received" | "processed" | "error"
      timestamp: "number",
    },
  },

  // Quality of Service settings for ROS2
  qos: {
    reliable: {
      reliability: "RELIABLE",
      durability: "TRANSIENT_LOCAL",
      history: "KEEP_LAST",
      depth: 10,
    },
    bestEffort: {
      reliability: "BEST_EFFORT",
      durability: "VOLATILE",
      history: "KEEP_LAST",
      depth: 1,
    },
  },
};

/**
 * Helper function to get student-specific topic
 * @param {string} baseTopic - Base topic path
 * @param {string} nim - Student NIM
 * @returns {string} Full topic path
 */
export function getStudentTopic(baseTopic, nim) {
  return `${baseTopic}/${nim}`;
}

/**
 * Helper function to get classroom-specific topic
 * @param {string} baseTopic - Base topic path
 * @param {string} roomId - Room ID
 * @returns {string} Full topic path
 */
export function getClassroomTopic(baseTopic, roomId) {
  return `${baseTopic}/${roomId}`;
}

/**
 * Helper function to get device-specific topic
 * @param {string} baseTopic - Base topic path
 * @param {string} deviceCode - Device code
 * @returns {string} Full topic path
 */
export function getDeviceTopic(baseTopic, deviceCode) {
  return `${baseTopic}/${deviceCode}`;
}

export default ROS2_CONFIG;
