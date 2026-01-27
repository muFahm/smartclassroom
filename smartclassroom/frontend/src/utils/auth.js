/**
 * Auth Utility Functions
 * Helper functions for authentication management
 */

/**
 * Save user authentication data to localStorage
 * @param {string} token - Auth token
 * @param {object} user - User data object
 */
export const login = (token, user) => {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(user));
};

/**
 * Remove user authentication data from localStorage
 */
export const logout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};

/**
 * Get token from localStorage
 * @returns {string|null} token or null
 */
export const getToken = () => {
  return sessionStorage.getItem("token");
};

/**
 * Get user data from localStorage
 * @returns {object|null} User object or null
 */
export const getUser = () => {
  const userStr = sessionStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  return !!getToken() && !!getUser();
};

/**
 * Get authorization header for API requests
 * @returns {object} Authorization header object
 */
export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
};
