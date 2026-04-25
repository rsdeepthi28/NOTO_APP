import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0d0f17",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      overflow: "auto",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "400px",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "380px", position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "white", letterSpacing: "-3px", fontFamily: "monospace", lineHeight: 1 }}>
            No<span style={{ color: "#7c3aed" }}>To</span>
          </div>
          <div style={{ fontSize: "11px", color: "#374151", letterSpacing: "4px", textTransform: "uppercase", marginTop: "10px" }}>
            code · notes · collaborate
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#111318",
          border: "1px solid #1e2030",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}>
          <h2 style={{ color: "white", fontSize: "18px", fontWeight: 600, marginBottom: "24px", margin: "0 0 24px 0" }}>
            Welcome back
          </h2>

          {error && (
            <div style={{
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "10px", padding: "10px 14px", fontSize: "13px",
              color: "#f87171", marginBottom: "16px",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#4b5563", marginBottom: "7px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: "100%", background: "#16181f", border: "1px solid #1e2030", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#e2e8f0", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#1e2030"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#4b5563", marginBottom: "7px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", background: "#16181f", border: "1px solid #1e2030", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", color: "#e2e8f0", outline: "none", fontFamily: "monospace", boxSizing: "border-box" }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#1e2030"}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "12px", marginTop: "6px",
                background: loading ? "#4c1d95" : "#7c3aed",
                border: "none", borderRadius: "10px", fontSize: "14px",
                color: "white", cursor: loading ? "default" : "pointer",
                fontWeight: 700, boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#6d28d9"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#7c3aed"; }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#374151", marginTop: "20px", marginBottom: 0 }}>
            No account?{" "}
            <Link to="/signup" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}