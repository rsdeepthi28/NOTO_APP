import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function timeSince(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function Dashboard() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const { dark } = useTheme();

  const [notes, setNotes]         = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const searchTimer = useRef(null);

  const T = {
    card:       dark ? "#0a0c12" : "#ffffff",
    cardBdr:    dark ? "#13151f" : "#e2e5f0",
    cardHover:  dark ? "#0d0f1a" : "#f5f3ff",
    cardBdrH:   dark ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.4)",
    text:       dark ? "#e2e8f0" : "#1a1d2e",
    text2:      dark ? "#374151" : "#6b7280",
    text3:      dark ? "#1e2030" : "#c4c9e0",
    search:     dark ? "#0a0c12" : "#ffffff",
    searchBdr:  dark ? "#13151f" : "#e2e5f0",
    tag:        dark ? "rgba(124,58,237,0.1)" : "rgba(124,58,237,0.08)",
    tagBdr:     dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.25)",
    tagC:       dark ? "#7c3aed"              : "#6d28d9",
    delBg:      dark ? "#0d0f17"              : "#f8f9fc",
    delBdr:     dark ? "#1e2030"              : "#e2e5f0",
    delC:       dark ? "#374151"              : "#9ca3af",
  };

  useEffect(() => { fetchNotes(); }, []);

  async function fetchNotes() {
    const local = JSON.parse(localStorage.getItem("noto_notes") || "[]");
    setNotes(local); setFiltered(local); setLoading(false);
    try {
      const data = await apiFetch("/notes");
      if (Array.isArray(data)) {
        const backendIds = new Set(data.map(n => n.id));
        const merged = [...data, ...local.filter(n => !backendIds.has(n.id))];
        setNotes(merged); setFiltered(merged);
        localStorage.setItem("noto_notes", JSON.stringify(merged));
      }
    } catch {}
  }

  useEffect(() => {
    clearTimeout(searchTimer.current);
    const q = search.trim().toLowerCase();
    let result = q ? notes.filter(n =>
      (n.title||"").toLowerCase().includes(q) ||
      JSON.stringify(n.content||"").toLowerCase().includes(q) ||
      (n.tags||[]).some(t => t.toLowerCase().includes(q))
    ) : notes;
    if (activeTag) result = result.filter(n => (n.tags||[]).includes(activeTag));
    searchTimer.current = setTimeout(() => setFiltered(result), 150);
  }, [search, notes, activeTag]);

  async function deleteNote(id, e) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated); setFiltered(updated.filter(n => !activeTag || (n.tags||[]).includes(activeTag)));
    localStorage.setItem("noto_notes", JSON.stringify(updated));
    try { await apiFetch(`/notes/${id}`, { method:"DELETE" }); } catch {}
  }

  const allTags = [...new Set(notes.flatMap(n => n.tags||[]))];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom:"36px" }} className="fade-in">
        <div style={{ fontSize:"28px", fontWeight:700, color: T.text, marginBottom:"4px", letterSpacing:"-0.5px" }}>
          {greeting}, {user?.name?.split(" ")[0]} 👋
        </div>
        <div style={{ fontSize:"14px", color: T.text2 }}>
          {notes.length === 0 ? "Create your first note to get started." : `You have ${notes.length} note${notes.length!==1?"s":""}.`}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px", marginBottom:"32px" }} className="stagger">
        {[
          { label:"Total Notes",  value:notes.length,  accent:"#7c3aed" },
          { label:"Tags Used",    value:allTags.length, accent:"#06b6d4" },
          { label:"This Week",    value:notes.filter(n=>(Date.now()-new Date(n.savedAt||n.created_at))<7*86400000).length, accent:"#22c55e" },
        ].map(s => (
          <div key={s.label} className="fade-in" style={{ background: T.card, border:`1px solid ${T.cardBdr}`, borderRadius:"14px", padding:"18px 20px", position:"relative", overflow:"hidden", transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px ${s.accent}30`}
            onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
            <div style={{ position:"absolute", top:0, right:0, width:"80px", height:"80px", background:`radial-gradient(circle, ${s.accent}15 0%, transparent 70%)`, pointerEvents:"none" }} />
            <div style={{ fontSize:"11px", color: T.text2, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"8px" }}>{s.label}</div>
            <div style={{ fontSize:"30px", fontWeight:800, color:s.accent, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"20px" }} className="fade-in">
        <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", color: T.text2, fontSize:"14px" }}>🔍</span>
        <input type="text" placeholder="Search notes…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%", background: T.search, border:`1px solid ${T.searchBdr}`, borderRadius:"12px", paddingLeft:"40px", paddingRight:"16px", paddingTop:"11px", paddingBottom:"11px", fontSize:"14px", color: T.text, outline:"none", boxSizing:"border-box", fontFamily:"'DM Mono',monospace" }}
          onFocus={e=>e.currentTarget.style.borderColor="#7c3aed"}
          onBlur={e=>e.currentTarget.style.borderColor=T.searchBdr} />
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"24px" }} className="fade-in">
          {["All",...allTags].map(tag => {
            const isAll = tag==="All";
            const active = isAll?!activeTag:activeTag===tag;
            return (
              <button key={tag} onClick={()=>setActiveTag(isAll?null:activeTag===tag?null:tag)}
                style={{ fontSize:"11px", padding:"5px 12px", borderRadius:"20px", border:`1px solid ${active?"rgba(124,58,237,0.4)":T.cardBdr}`, background:active?"rgba(124,58,237,0.15)":"transparent", color:active?"#a78bfa": T.text2, cursor:"pointer", fontFamily:"'DM Mono',monospace", transition:"all 0.15s" }}>
                {isAll?"All":`#${tag}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Notes grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"14px" }} className="stagger">
        {/* Create card */}
        <Link to="/note/new" style={{ textDecoration:"none" }} className="fade-in">
          <div style={{ border:`1px dashed ${T.cardBdr}`, borderRadius:"16px", minHeight:"160px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"10px", cursor:"pointer", color: T.text2, transition:"all 0.2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#7c3aed"; e.currentTarget.style.color="#7c3aed"; e.currentTarget.style.background="rgba(124,58,237,0.04)"; e.currentTarget.style.transform="translateY(-3px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.cardBdr; e.currentTarget.style.color=T.text2; e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="translateY(0)"; }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:"1px dashed currentColor", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>+</div>
            <div style={{ fontSize:"13px", fontWeight:500 }}>New note</div>
          </div>
        </Link>

        {loading
          ? [1,2,3].map(i=>(
              <div key={i} className="shimmer fade-in" style={{ borderRadius:"16px", height:"160px", border:`1px solid ${T.cardBdr}` }} />
            ))
          : filtered.map((note, idx) => {
              const title = note.title||"Untitled";
              const html  = note.content?.html||(typeof note.content==="string"?note.content:"");
              const preview = html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,130)||"Empty note…";
              const time = note.updated_at||note.updatedAt||note.savedAt||note.created_at;

              return (
                <div key={note.id} className="fade-in note-card" style={{ position:"relative", animationDelay:`${idx*40}ms` }}
                  onMouseEnter={e=>e.currentTarget.querySelector(".del-btn").style.opacity="1"}
                  onMouseLeave={e=>e.currentTarget.querySelector(".del-btn").style.opacity="0"}>
                  <Link to={`/note/edit/${note.id}`} style={{ textDecoration:"none" }}>
                    <div style={{ background: T.card, border:`1px solid ${T.cardBdr}`, borderRadius:"16px", padding:"18px", minHeight:"160px", display:"flex", flexDirection:"column", cursor:"pointer", overflow:"hidden", position:"relative" }}>
                      {/* Top shimmer line on hover */}
                      <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg, transparent, #7c3aed, transparent)", opacity:0, transition:"opacity 0.2s" }}
                        className="card-shimmer" />
                      <div style={{ fontSize:"13px", fontWeight:600, color: T.text, marginBottom:"8px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</div>
                      <div style={{ fontSize:"12px", color: T.text2, lineHeight:"1.7", flex:1, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical" }}>{preview}</div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"14px", flexWrap:"wrap", gap:"6px" }}>
                        <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                          {(note.tags||[]).slice(0,2).map(t=>(
                            <span key={t} style={{ fontSize:"10px", background: T.tag, color: T.tagC, border:`1px solid ${T.tagBdr}`, padding:"2px 8px", borderRadius:"20px", fontFamily:"'DM Mono',monospace" }}>#{t}</span>
                          ))}
                        </div>
                        <span style={{ fontSize:"11px", color: T.text3, fontFamily:"'DM Mono',monospace" }}>{time?timeSince(time):""}</span>
                      </div>
                    </div>
                  </Link>
                  <div className="del-btn" style={{ position:"absolute", top:"10px", right:"10px", opacity:0, transition:"opacity 0.15s" }}>
                    <button onClick={e=>deleteNote(note.id,e)}
                      style={{ width:"26px", height:"26px", borderRadius:"8px", background: T.delBg, border:`1px solid ${T.delBdr}`, color: T.delC, cursor:"pointer", fontSize:"13px", display:"flex", alignItems:"center", justifyContent:"center" }}
                      onMouseEnter={e=>{ e.currentTarget.style.background="rgba(248,113,113,0.1)"; e.currentTarget.style.color="#f87171"; e.currentTarget.style.borderColor="rgba(248,113,113,0.3)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=T.delBg; e.currentTarget.style.color=T.delC; e.currentTarget.style.borderColor=T.delBdr; }}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
      </div>

      {!loading && filtered.length===0 && (
        <div className="fade-in" style={{ textAlign:"center", padding:"80px 20px", color: T.text2 }}>
          <div style={{ fontSize:"48px", marginBottom:"16px", opacity:0.2 }}>📭</div>
          <div style={{ fontSize:"14px" }}>{search?`No notes match "${search}"`:"No notes yet"}</div>
        </div>
      )}
    </Layout>
  );
}