const STORAGE_KEY = "smartclassroom.tokens";

export function saveTokens(tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function loadTokens() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse auth tokens", error);
    return null;
  }
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}
