import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = sessionStorage.getItem("noto_token");
    const storedUser  = sessionStorage.getItem("noto_user");

    if (!storedToken) { setLoading(false); return; }

    // Use cached user immediately — no blank screen
    try {
      const parsed = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsed);
    } catch {}
    setLoading(false);

    // Validate in background
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
      signal: AbortSignal.timeout(5000),
    })
      .then(r => { if (!r.ok) throw new Error("invalid"); return r.json(); })
      .then(u => {
        setUser(u);
        sessionStorage.setItem("noto_user", JSON.stringify(u));
      })
      .catch(() => {
        // Token invalid — force logout
        sessionStorage.removeItem("noto_token");
        sessionStorage.removeItem("noto_user");
        setToken(null);
        setUser(null);
      });
  }, []);

  function login(tokenStr, userData) {
    sessionStorage.setItem("noto_token", tokenStr);
    sessionStorage.setItem("noto_user", JSON.stringify(userData));
    setToken(tokenStr);
    setUser(userData);
  }

  function logout() {
    sessionStorage.removeItem("noto_token");
    sessionStorage.removeItem("noto_user");
    // Clear this user's cached notes from localStorage
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