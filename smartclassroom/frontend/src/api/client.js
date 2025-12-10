const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

let authTokens = null;
let refreshCallback = null;

export function setAuthTokens(tokens) {
  authTokens = tokens;
}

export function registerOnTokenRefresh(handler) {
  refreshCallback = handler;
}

async function refreshAccessToken() {
  if (!authTokens?.refresh) return null;
  const response = await fetch(`${API_BASE_URL}/api/accounts/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: authTokens.refresh }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const newTokens = { ...authTokens, access: data.access };
  authTokens = newTokens;
  if (refreshCallback) {
    refreshCallback(newTokens);
  }
  return newTokens;
}

export async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (authTokens?.access) {
    headers.Authorization = `Bearer ${authTokens.access}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const newTokens = await refreshAccessToken();
    if (!newTokens) {
      throw new Error("Unauthorized");
    }
    headers.Authorization = `Bearer ${newTokens.access}`;
    const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
    if (!retryResponse.ok) {
      const errorBody = await retryResponse.json().catch(() => ({}));
      throw new Error(errorBody.detail || "Request failed");
    }
    return retryResponse;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || errorBody.error || "Request failed";
    throw new Error(message);
  }

  return response;
}

export async function loginRequest(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/accounts/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Login gagal");
  }
  return response.json();
}

export async function fetchProfile() {
  const response = await apiRequest(`/api/accounts/me/`);
  return response.json();
}
