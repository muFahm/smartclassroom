/**
 * Service untuk registrasi biometrik (wajah + suara)
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const BIOMETRIC_API = `${API_BASE_URL}/api/attendance/biometric-registrations`;
const BIOMETRIC_FACE_API = `${API_BASE_URL}/api/attendance/biometric-face-datasets`;
const BIOMETRIC_VOICE_API = `${API_BASE_URL}/api/attendance/biometric-voice-datasets`;

async function apiRequest(endpoint = "", options = {}, baseUrl = BIOMETRIC_API) {
  const url = `${baseUrl}${endpoint}`;
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  if (!response.ok) {
    const errorBody = await response.text();
    const errorMessage = errorBody || `API Error: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function createBiometricRegistration(payload) {
  return apiRequest("/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createFaceDataset(payload) {
  return apiRequest("/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, BIOMETRIC_FACE_API);
}

export async function createVoiceDataset(payload) {
  return apiRequest("/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, BIOMETRIC_VOICE_API);
}

export async function getBiometricRegistrations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.studentNim) params.append("student_nim", filters.studentNim);
  if (filters.lecturerId) params.append("lecturer_id", filters.lecturerId);
  const query = params.toString();
  return apiRequest(query ? `/?${query}` : "/");
}

export default {
  createBiometricRegistration,
  createFaceDataset,
  createVoiceDataset,
  getBiometricRegistrations,
};
