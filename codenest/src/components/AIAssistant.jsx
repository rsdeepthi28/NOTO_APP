import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ACTIONS = [
  { id: "improve",   label: "✨ Improve",       desc: "Rewrite to be clearer and stronger" },
  { id: "fix",       label: "🔧 Fix Grammar",   desc: "Fix spelling, grammar, punctuation" },
  { id: "summarize", label: "📝 Summarize",     desc: "Condense to key points" },
  { id: "expand",    label: "🔭 Expand",         desc: "Add detail and context" },
  { id: "bullets",   label: "• Bullets",         desc: "Convert to bullet points" },
  { id: "heading",   label: "# Heading",         desc: "Generate a title" },
  { id: "code",      label: "⟨/⟩ Explain Code", desc: "Explain what code does" },
];

export default function AIAssistant({ editor }) {
  const { token } = useAuth();
  const { dark } = useTheme();

  const [visible, setVisible]     = useState(false);
  const [pos, setPos]             = useState({ x: 0, y: 0 });
  const [result, setResult]       = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const [loading, setLoading]     = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [tooltip, setTooltip]     = useState(null);
  const [error, setError]         = useState("");
  const [isCode, setIsCode]       = useState(false);
  const toolbarRef = useRef(null);
  const mouseRef   = useRef({ x: 0, y: 0 });

  const bg   = dark ? "#0a0c12" : "#ffffff";
  const bdr  = dark ? "#2a2d3e" : "#e2e5f0";
  const tx   = dark ? "#d1d5db" : "#1a1d2e";
  const mu   = dark ? "#9ca3af" : "#6b7280";
  const bg2  = dark ? "#111318" : "#f8f9fc";
  const bdr2 = dark ? "#1e2030" : "#e2e5f0";

  useEffect(() => {
    const onMove = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const onUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const txt = sel?.toString().trim();
        if (!txt || txt.length < 3) return;
        const editorEl = document.querySelector(".ProseMirror");
        const inTA = document.activeElement?.tagName === "TEXTAREA";
        if (!editorEl?.contains(sel.anchorNode) && !inTA) return;
        setIsCode(inTA);
        setSelectedText(txt);
        setResult(null);
        setError("");
        setPos({
          x: Math.max(200, Math.min(mouseRef.current.x, window.innerWidth - 200)),
          y: mouseRef.current.y + 16,
        });
        setVisible(true);
      }, 50);
    };
    document.addEventListener("mouseup", onUp);
    return () => document.removeEventListener("mouseup", onUp);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        if (!window.getSelection()?.toString().trim()) { setVisible(false); setResult(null); }
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function runAction(action) {
    if (!selectedText || loading) return;
    setLoading(true); setLoadingId(action.id); setResult(null); setError("");
    try {
      const res = await fetch(`${API}/ai/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: selectedText, action: action.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult({ label: action.label, text: data.result, isCode: action.id === "code" });
    } catch (err) {
      setError(err.message || "AI request failed");
    } finally {
      setLoading(false); setLoadingId(null);
    }
  }

  function applyResult() {
    if (!result || !editor) return;
    if (result.isCode || isCode) {
      editor.chain().focus().insertContentAt(
        editor.state.doc.content.size,
        `<p><strong>Code Explanation:</strong> ${result.text}</p>`
      ).run();
    } else {
      const { state, dispatch } = editor.view;
      const { from, to } = state.selection;
      dispatch(state.tr.insertText(result.text, from, to));
    }
    setVisible(false); setResult(null);
    window.getSelection()?.removeAllRanges();
  }

  if (!visible) return null;

  return (
    <div ref={toolbarRef} style={{ position:"fixed", top:`${pos.y}px`, left:`${pos.x}px`, transform:"translateX(-50%)", zIndex:9999 }}>
      {!result && !error && (
        <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:"14px", padding:"8px", display:"flex", alignItems:"center", gap:"3px", flexWrap:"wrap", maxWidth:"460px", boxShadow:"0 12px 40px rgba(0,0,0,0.8)" }}>
          <div style={{ fontSize:"10px", color:"#7c6cfa", fontFamily:"monospace", padding:"3px 10px", borderRight:`1px solid ${bdr2}`, marginRight:"3px", fontWeight:700, whiteSpace:"nowrap" }}>✦ AI</div>
          {ACTIONS.map((a) => (
            <div key={a.id} style={{ position:"relative" }}>
              <button onClick={() => runAction(a)} disabled={loading}
                onMouseEnter={(e) => { setTooltip(a.id); if(!loading){e.currentTarget.style.background="rgba(124,108,250,0.15)";e.currentTarget.style.color="#a78bfa";} }}
                onMouseLeave={(e) => { setTooltip(null); if(loadingId!==a.id){e.currentTarget.style.background="transparent";e.currentTarget.style.color=mu;} }}
                style={{ background:loadingId===a.id?"rgba(124,108,250,0.2)":"transparent", border:"none", borderRadius:"8px", padding:"5px 9px", fontSize:"11px", color:loadingId===a.id?"#a78bfa":mu, cursor:loading?"default":"pointer", whiteSpace:"nowrap", transition:"all 0.15s", opacity:loading&&loadingId!==a.id?0.4:1 }}>
                {loadingId===a.id?"⏳ Working…":a.label}
              </button>
              {tooltip===a.id && !loading && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", left:"50%", transform:"translateX(-50%)", background:bdr2, color:mu, fontSize:"10px", padding:"3px 8px", borderRadius:"6px", whiteSpace:"nowrap", pointerEvents:"none", zIndex:10, border:`1px solid ${bdr}` }}>
                  {a.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {result && (
        <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:"16px", padding:"16px", boxShadow:"0 12px 40px rgba(0,0,0,0.8)", width:"360px", maxWidth:"90vw" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
            <span style={{ fontSize:"11px", color:"#7c6cfa", fontFamily:"monospace", fontWeight:700 }}>✦ {result.label}</span>
            <button onClick={()=>setResult(null)} style={{ background:"none", border:"none", color:mu, cursor:"pointer", fontSize:"16px" }}>✕</button>
          </div>
          {result.isCode && <div style={{ fontSize:"11px", color:"#f59e0b", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:"8px", padding:"6px 10px", marginBottom:"10px" }}>💡 Will be inserted below the code block</div>}
          <div style={{ fontSize:"10px", color:mu, fontFamily:"monospace", marginBottom:"6px", textTransform:"uppercase", letterSpacing:"1px" }}>Result</div>
          <div style={{ background:bg2, borderRadius:"10px", padding:"12px", fontSize:"13px", color:tx, lineHeight:"1.7", maxHeight:"180px", overflowY:"auto", marginBottom:"12px", border:`1px solid ${bdr2}`, whiteSpace:"pre-wrap" }}>{result.text}</div>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={applyResult} style={{ flex:1, background:"#7c3aed", border:"none", borderRadius:"8px", padding:"8px", fontSize:"12px", color:"white", cursor:"pointer", fontWeight:600 }}
              onMouseEnter={e=>e.currentTarget.style.background="#6d28d9"} onMouseLeave={e=>e.currentTarget.style.background="#7c3aed"}>
              ✓ {result.isCode?"Insert below code":"Replace selection"}
            </button>
            <button onClick={()=>navigator.clipboard.writeText(result.text)} style={{ padding:"8px 12px", background:bdr2, border:`1px solid ${bdr}`, borderRadius:"8px", fontSize:"12px", color:mu, cursor:"pointer" }}>Copy</button>
            <button onClick={()=>setResult(null)} style={{ padding:"8px 12px", background:"transparent", border:`1px solid ${bdr}`, borderRadius:"8px", fontSize:"12px", color:mu, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background:bg, border:"1px solid #7f1d1d", borderRadius:"12px", padding:"14px 16px", boxShadow:"0 12px 40px rgba(0,0,0,0.8)", maxWidth:"320px" }}>
          <div style={{ fontSize:"12px", color:"#f87171", marginBottom:"10px" }}>❌ {error}</div>
          <button onClick={()=>setError("")} style={{ fontSize:"11px", color:mu, background:"none", border:`1px solid ${bdr}`, borderRadius:"6px", padding:"4px 10px", cursor:"pointer" }}>Dismiss</button>
        </div>
      )}
    </div>
  );
}