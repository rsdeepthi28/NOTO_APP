import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const navItems = [
    { to: "/",         label: "Dashboard", icon: "⊞" },
    { to: "/note/new", label: "New Note",  icon: "✦" },
  ];

  const T = {
    sidebar:    dark ? "#0a0c12"              : "#ffffff",
    sidebarBdr: dark ? "#13151f"              : "#e2e5f0",
    logo:       dark ? "#a78bfa"              : "#7c3aed",
    subText:    dark ? "#1e2030"              : "#c4c9e0",
    navActive:  dark ? "rgba(124,58,237,0.12)": "rgba(124,58,237,0.08)",
    navActiveBdr:dark? "rgba(124,58,237,0.25)": "rgba(124,58,237,0.3)",
    navActiveC: dark ? "#a78bfa"              : "#7c3aed",
    navHover:   dark ? "rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)",
    navColor:   dark ? "#374151"              : "#9ca3af",
    userBg:     dark ? "rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",
    avatarGlow: dark ? "0 0 12px rgba(124,58,237,0.4)" : "0 0 12px rgba(124,58,237,0.2)",
    userName:   dark ? "#d1d5db"              : "#1a1d2e",
    userEmail:  dark ? "#1e2030"              : "#9ca3af",
    signout:    dark ? "#1e2030"              : "#c4c9e0",
    main:       dark ? "#0d0f17"              : "#f8f9fc",
    glow:       dark ? "rgba(124,58,237,0.05)": "rgba(124,58,237,0.03)",
    toggleBg:   dark ? "#1e2030"              : "#e8eaf2",
    toggleIcon: dark ? "🌙"                   : "☀️",
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background: T.main }}>

      {/* Sidebar */}
      <aside style={{ width:"210px", background: T.sidebar, borderRight:`1px solid ${T.sidebarBdr}`, display:"flex", flexDirection:"column", flexShrink:0, position:"relative", overflow:"hidden" }}
        className="slide-in-left">

        {/* Glow */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"200px", background:`radial-gradient(ellipse at top, ${T.glow} 0%, transparent 70%)`, pointerEvents:"none" }} />

        {/* Logo */}
        <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${T.sidebarBdr}`, position:"relative" }}>
          <div style={{ fontSize:"26px", fontWeight:800, color: dark?"white":"#1a1d2e", letterSpacing:"-1.5px", fontFamily:"'DM Mono',monospace", lineHeight:1 }}>
            No<span style={{ color: T.logo }}>To</span>
          </div>
          <div style={{ fontSize:"9px", color: T.subText, letterSpacing:"3px", textTransform:"uppercase", marginTop:"5px" }}>
            code · notes · collab
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"16px 12px", overflowY:"auto" }}>
          <div style={{ fontSize:"9px", color: T.subText, letterSpacing:"2px", textTransform:"uppercase", padding:"0 8px", marginBottom:"10px" }}>Workspace</div>
          {navItems.map((item, i) => {
            const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className="fade-in"
                style={{ animationDelay:`${i*60}ms`, display:"flex", alignItems:"center", gap:"10px", padding:"9px 12px", borderRadius:"10px", marginBottom:"3px", fontSize:"13px", textDecoration:"none", background: isActive ? T.navActive : "transparent", border:`1px solid ${isActive ? T.navActiveBdr : "transparent"}`, color: isActive ? T.navActiveC : T.navColor }}
                onMouseEnter={(e) => { if(!isActive){ e.currentTarget.style.background=T.navHover; e.currentTarget.style.color=dark?"#6b7280":"#4b5280"; }}}
                onMouseLeave={(e) => { if(!isActive){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.navColor; }}}>
                <span style={{ fontSize:"14px" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle + user */}
        <div style={{ padding:"14px 12px", borderTop:`1px solid ${T.sidebarBdr}` }}>

          {/* Theme toggle */}
          <button onClick={toggle}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"10px", marginBottom:"8px", background: T.toggleBg, border:"none", cursor:"pointer", fontSize:"12px", color: T.navColor }}
            onMouseEnter={(e) => { e.currentTarget.style.background=dark?"#2a2d3e":"#dde0f0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background=T.toggleBg; }}>
            <span style={{ fontSize:"16px" }}>{T.toggleIcon}</span>
            <span style={{ fontFamily:"'DM Mono',monospace" }}>{dark ? "Light mode" : "Dark mode"}</span>
          </button>

          {/* User */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"10px", marginBottom:"6px", background: T.userBg }}>
            <div style={{ width:"30px", height:"30px", borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg, #7c3aed, #a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:700, color:"white", boxShadow: T.avatarGlow }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow:"hidden", flex:1 }}>
              <div style={{ fontSize:"12px", fontWeight:600, color: T.userName, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
              <div style={{ fontSize:"10px", color: T.userEmail, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
            </div>
          </div>

          <button onClick={() => { logout(); navigate("/login"); }}
            style={{ width:"100%", padding:"7px", background:"transparent", border:`1px solid transparent`, borderRadius:"8px", fontSize:"11px", color: T.signout, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}
            onMouseEnter={(e) => { e.currentTarget.style.color="#f87171"; e.currentTarget.style.borderColor="rgba(248,113,113,0.2)"; e.currentTarget.style.background="rgba(248,113,113,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color=T.signout; e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.background="transparent"; }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflowY:"auto", background: T.main, position:"relative" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"300px", background:`radial-gradient(ellipse at 60% -20%, ${T.glow} 0%, transparent 60%)`, pointerEvents:"none" }} />
        <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"40px 48px", position:"relative" }} className="fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}