import { getAuthHeader } from "../utils/auth";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export async function quizRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...getAuthHeader(),
  };

  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormDataBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || errorBody.error || errorBody.message || "Request failed";
    throw new Error(message);
  }

  return response;
}
