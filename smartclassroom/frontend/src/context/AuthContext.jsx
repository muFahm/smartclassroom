import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchProfile, loginRequest, registerOnTokenRefresh, setAuthTokens } from "../api/client";
import { clearTokens, loadTokens, saveTokens } from "../utils/tokenStorage";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedTokens = loadTokens();
    if (!storedTokens) {
      setLoading(false);
      return;
    }
    setAuthTokens(storedTokens);
    setTokens(storedTokens);
    fetchProfile()
      .then(setUser)
      .catch(() => {
        clearTokens();
        setAuthTokens(null);
        setTokens(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    registerOnTokenRefresh((newTokens) => {
      setTokens(newTokens);
      saveTokens(newTokens);
    });
  }, []);

  const login = async (email, password) => {
    const data = await loginRequest(email, password);
    const payload = { access: data.access, refresh: data.refresh };
    setAuthTokens(payload);
    setTokens(payload);
    saveTokens(payload);
    setUser(data.user);
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    setAuthTokens(null);
    clearTokens();
  };

  const value = useMemo(
    () => ({ user, tokens, login, logout, loading, isAuthenticated: Boolean(user) }),
    [user, tokens, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

