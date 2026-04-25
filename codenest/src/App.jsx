import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import NotePage from "./pages/NotePage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ViewNote from "./pages/ViewNote";
import SharedNote from "./pages/SharedNote";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height:"100vh", background:"#0d0f17", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px" }}>
      <div style={{ fontSize:"36px", fontWeight:800, color:"white", letterSpacing:"-2px", fontFamily:"monospace" }}>
        No<span style={{ color:"#7c3aed" }}>To</span>
      </div>
      <div style={{ width:"24px", height:"24px", border:"2px solid #1e2030", borderTop:"2px solid #7c3aed", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div style={{ height:"100vh", background:"#0d0f17" }}>
      <Routes>
        <Route path="/login"         element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup"        element={<GuestRoute><Signup /></GuestRoute>} />
        <Route path="/shared/:token" element={<SharedNote />} />
        <Route path="/"              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/note/new"      element={<ProtectedRoute><NotePage /></ProtectedRoute>} />
        <Route path="/note/edit/:id" element={<ProtectedRoute><NotePage /></ProtectedRoute>} />
        <Route path="/note/:id"      element={<ProtectedRoute><ViewNote /></ProtectedRoute>} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}