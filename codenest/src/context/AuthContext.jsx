import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("noto_user")) || null; } catch { return null; }
  });
  const [token, setToken]     = useState(() => sessionStorage.getItem("noto_token") || null);
  const [loading, setLoading] = useState(false);

  function login(tokenStr, userData) {
    sessionStorage.setItem("noto_token", tokenStr);
    sessionStorage.setItem("noto_user", JSON.stringify(userData));
    setToken(tokenStr);
    setUser(userData);
  }

  function logout() {
    sessionStorage.removeItem("noto_token");
    sessionStorage.removeItem("noto_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }