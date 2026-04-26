import { useTheme } from "../context/ThemeContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import CodeExecution from "../extensions/CodeExecutionComponent";
import AIAssistant from "../components/AIAssistant";
import NoteStats from "../components/NoteStats";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import useVersionHistory from "../hooks/useVersionHistory";

function getUserNotesKey(userId) { return `noto_notes_${userId}`; }

export default function NotePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { apiFetch } = useApi();
  const { dark } = useTheme();

  const [noteId, setNoteId]         = useState(id || null);
  const [title, setTitle]           = useState("");
  const [tags, setTags]             = useState([]);
  const [tagInput, setTagInput]     = useState("");
  const [saveStatus, setSaveStatus] = useState("unsaved");
  const [savedAt, setSavedAt]       = useState(null);
  const [showShare, setShowShare]   = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareUrl, setShareUrl]     = useState("");
  const [isPublic, setIsPublic]     = useState(false);
  const [shareMsg, setShareMsg]     = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const editorReady = useRef(false);

  const NOTES_KEY = getUserNotesKey(user?.id);

  // Theme-aware colors
  const T = {
    bg:        dark ? "#0a0c12"  : "#ffffff",
    bg2:       dark ? "#111318"  : "#f8f9fc",
    bg3:       dark ? "#16181f"  : "#f1f3f9",
    border:    dark ? "#1e2030"  : "#e2e5f0",
    border2:   dark ? "#2a2d3e"  : "#d1d5e0",
    text:      dark ? "#e2e8f0"  : "#1a1d2e",
    text2:     dark ? "#9ca3af"  : "#4b5280",
    text3:     dark ? "#6b7280"  : "#6b7280",
    text4:     dark ? "#374151"  : "#9ca3af",
    btnBorder: dark ? "#2a2d3e"  : "#e2e5f0",
    btnColor:  dark ? "#6b7280"  : "#4b5280",
    divider:   dark ? "#1e2030"  : "#e2e5f0",
    modalBg:   dark ? "#111318"  : "#ffffff",
    modalBdr:  dark ? "#1e2030"  : "#e2e5f0",
    inputBg:   dark ? "#16181f"  : "#f8f9fc",
    inputC:    dark ? "#d1d5db"  : "#1a1d2e",
  };

  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight, CodeExecution],
    content: "<p></p>",
    editorProps: {
      attributes: {
        style: `outline:none; min-height:400px; color:${T.text}; font-size:15px; line-height:1.8;`,
      },
    },
    onUpdate: () => setSaveStatus("unsaved"),
  });

  const { versions, saveVersion, restoreVersion, showHistory, setShowHistory } =
    useVersionHistory(noteId, editor);

  // Load note
  useEffect(() => {
    if (!id || !editor || editorReady.current) return;
    const local = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
    const localNote = local.find((n) => n.id === id);
    if (localNote) {
      setTitle(localNote.title || "");
      setTags(localNote.tags || []);
      editor.commands.setContent(localNote.content?.html || "<p></p>");
      setSaveStatus("saved");
      setSavedAt(localNote.savedAt || null);
      editorReady.current = true;
    }
    apiFetch(`/notes/${id}`)
      .then((data) => {
        setTitle(data.title || "");
        setTags(data.tags || []);
        setIsPublic(data.is_public || false);
        setCollaborators(data.collaborators || []);
        if (data.content?.html) editor.commands.setContent(data.content.html);
        setSaveStatus("saved");
        editorReady.current = true;
      })
      .catch(() => {});
  }, [id, editor]);

  // Save
  const saveNote = useCallback(async () => {
    if (!editor) return;
    setSaveStatus("saving");
    const html = editor.getHTML();
    const noteTitle = title.trim() || "Untitled";
    const now = new Date().toISOString();
    const content = { html };

    const local = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
    const localId = noteId || `local-${Date.now()}`;
    const idx = local.findIndex((n) => n.id === localId);
    const obj = { id: localId, title: noteTitle, content, tags, savedAt: now, updatedAt: now };
    if (idx >= 0) local[idx] = obj; else local.unshift(obj);
    localStorage.setItem(NOTES_KEY, JSON.stringify(local));
    if (!noteId) setNoteId(localId);
    setSavedAt(now);
    saveVersion();

    try {
      if (noteId && !noteId.startsWith("local-")) {
        await apiFetch(`/notes/${noteId}`, {
          method: "PUT",
          body: JSON.stringify({ title: noteTitle, content, tags, is_public: isPublic }),
        });
      } else {
        const data = await apiFetch("/notes", {
          method: "POST",
          body: JSON.stringify({ title: noteTitle, content, tags }),
        });
        const updated = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
        const i = updated.findIndex((n) => n.id === localId);
        if (i >= 0) updated[i].id = data.id;
        localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
        setNoteId(data.id);
        window.history.replaceState(null, "", `/note/edit/${data.id}`);
      }
    } catch {}
    setSaveStatus("saved");
  }, [editor, title, tags, noteId, isPublic, saveVersion]);

  useEffect(() => {
    const t = setInterval(() => { if (saveStatus === "unsaved") saveNote(); }, 30000);
    return () => clearInterval(t);
  }, [saveStatus, saveNote]);

  useKeyboardShortcuts({
    "mod+s": saveNote,
    "mod+/": () => editor?.chain().focus().insertContent({ type: "codeExecution" }).run(),
    "mod+shift+h": () => setShowHistory((p) => !p),
  });

  function addTag(e) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,/g, "").toLowerCase();
      if (!tags.includes(tag)) setTags((p) => [...p, tag]);
      setTagInput("");
    }
  }

  async function handleShare() {
    if (!noteId || noteId.startsWith("local-")) await saveNote();
    setShareMsg("");
    try {
      const data = await apiFetch(`/notes/${noteId}/share`, {
        method: "POST",
        body: JSON.stringify({ email: shareEmail || undefined, is_public: isPublic }),
      });
      setShareUrl(data.shareUrl || "");
      setCollaborators(data.collaborators || []);
      setIsPublic(data.is_public);
      setShareEmail("");
      setShareMsg(shareEmail ? `✅ Invited ${shareEmail}` : "✅ Settings saved");
    } catch (err) { setShareMsg(`❌ ${err.message}`); }
  }

  const Btn = ({ onClick, label, active }) => (
    <button onClick={onClick}
      style={{ padding:"6px 12px", borderRadius:"8px", fontSize:"12px", fontFamily:"monospace", border:`1px solid ${active ? "#7c3aed" : T.btnBorder}`, background: active ? "rgba(124,58,237,0.2)" : "transparent", color: active ? "#a78bfa" : T.btnColor, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = dark ? "#d1d5db" : "#1a1d2e"; e.currentTarget.style.borderColor = dark ? "#374151" : "#9ca3af"; }}}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = T.btnColor; e.currentTarget.style.borderColor = T.btnBorder; }}}>
      {label}
    </button>
  );

  const statusMap = {
    unsaved: { text:"Unsaved",    color:"#f59e0b" },
    saving:  { text:"Saving…",   color:"#f59e0b" },
    saved:   { text:"Saved ✓",   color:"#22c55e" },
    error:   { text:"Local only", color:"#f97316" },
  };
  const status = statusMap[saveStatus] || statusMap.unsaved;

  if (!editor) return null;

  return (
    <Layout>
      <AIAssistant editor={editor} />

      <div style={{ maxWidth:"780px", margin:"0 auto" }}>

        {/* Topbar */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"28px", flexWrap:"wrap" }}>
          <button onClick={() => navigate("/")}
            style={{ color: T.text3, fontSize:"13px", background:"none", border:"none", cursor:"pointer" }}
            onMouseEnter={(e) => e.currentTarget.style.color = T.text}
            onMouseLeave={(e) => e.currentTarget.style.color = T.text3}>
            ← Back
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginLeft:"auto" }}>
            <span style={{ width:"7px", height:"7px", borderRadius:"50%", background:status.color, display:"inline-block" }} />
            <span style={{ fontSize:"11px", color: T.text4, fontFamily:"monospace" }}>{status.text}</span>
          </div>
          <button onClick={() => setShowHistory(true)}
            style={{ fontSize:"12px", padding:"6px 12px", borderRadius:"8px", border:`1px solid ${T.btnBorder}`, background:"transparent", color: T.btnColor, cursor:"pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = dark ? "#374151" : "#9ca3af"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.btnColor; e.currentTarget.style.borderColor = T.btnBorder; }}>
            🕐 History
          </button>
          <button onClick={() => setShowShare(true)}
            style={{ fontSize:"12px", padding:"6px 12px", borderRadius:"8px", border:`1px solid ${T.btnBorder}`, background:"transparent", color: T.btnColor, cursor:"pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = dark ? "#374151" : "#9ca3af"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.btnColor; e.currentTarget.style.borderColor = T.btnBorder; }}>
            🔗 Share
          </button>
          <button onClick={saveNote}
            style={{ fontSize:"12px", padding:"6px 16px", borderRadius:"8px", background:"#7c3aed", border:"none", color:"white", cursor:"pointer", fontWeight:600, boxShadow:"0 4px 12px rgba(124,58,237,0.3)" }}
            onMouseEnter={(e) => e.currentTarget.style.background="#6d28d9"}
            onMouseLeave={(e) => e.currentTarget.style.background="#7c3aed"}>
            💾 Save
          </button>
        </div>

        {/* Title */}
        <input type="text" placeholder="Untitled note…" value={title}
          onChange={(e) => { setTitle(e.target.value); setSaveStatus("unsaved"); }}
          style={{ width:"100%", background:"transparent", fontSize:"34px", fontWeight:700, color: T.text, border:"none", outline:"none", marginBottom:"12px", letterSpacing:"-0.5px", fontFamily:"inherit" }} />

        {/* Tags */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"20px", minHeight:"28px" }}>
          {tags.map((tag) => (
            <span key={tag} style={{ fontSize:"11px", background:"rgba(124,58,237,0.15)", color:"#a78bfa", border:"1px solid rgba(124,58,237,0.3)", padding:"3px 10px", borderRadius:"20px", display:"flex", alignItems:"center", gap:"5px", fontFamily:"monospace" }}>
              #{tag}
              <button onClick={() => setTags((p) => p.filter((t) => t !== tag))}
                style={{ background:"none", border:"none", color:"#7c3aed", cursor:"pointer", fontSize:"14px", lineHeight:1, padding:0 }}>×</button>
            </span>
          ))}
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag}
            placeholder={tags.length === 0 ? "Add tags (press Enter)…" : "+tag"}
            style={{ background:"transparent", border:"none", outline:"none", fontSize:"12px", color: T.text3, fontFamily:"monospace", width:tags.length===0?"200px":"80px" }} />
        </div>

        <div style={{ height:"1px", background: T.divider, marginBottom:"16px" }} />

        {/* AI hint */}
        <div style={{ fontSize:"11px", color: T.text4, fontFamily:"monospace", marginBottom:"12px", display:"flex", alignItems:"center", gap:"6px" }}>
          <span style={{ color:"#7c6cfa" }}>✦</span>
          Select any text to open the writing tools
          <span style={{ marginLeft:"auto", color: dark ? "#1e2030" : "#c4c9e0" }}>Ctrl+S save · Ctrl+/ code block · Ctrl+Shift+H history</span>
        </div>

        {/* Toolbar */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"16px" }}>
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} label="Bold" active={editor.isActive("bold")} />
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic" active={editor.isActive("italic")} />
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline" active={editor.isActive("underline")} />
          <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} label="Highlight" active={editor.isActive("highlight")} />
          <div style={{ width:"1px", background: T.divider, margin:"0 4px" }} />
          <Btn onClick={() => editor.chain().focus().toggleHeading({level:2}).run()} label="H2" active={editor.isActive("heading",{level:2})} />
          <Btn onClick={() => editor.chain().focus().toggleHeading({level:3}).run()} label="H3" active={editor.isActive("heading",{level:3})} />
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} label="• List" active={editor.isActive("bulletList")} />
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1. List" active={editor.isActive("orderedList")} />
          <div style={{ width:"1px", background: T.divider, margin:"0 4px" }} />
          <button onClick={() => editor.chain().focus().insertContent({type:"codeExecution"}).run()}
            style={{ padding:"6px 12px", borderRadius:"8px", fontSize:"12px", fontFamily:"monospace", border:"1px solid rgba(34,197,94,0.3)", background:"rgba(34,197,94,0.08)", color:"#22c55e", cursor:"pointer" }}
            onMouseEnter={(e) => e.currentTarget.style.background="rgba(34,197,94,0.15)"}
            onMouseLeave={(e) => e.currentTarget.style.background="rgba(34,197,94,0.08)"}>
            ⟨/⟩ Code Block
          </button>
        </div>

        {/* Editor */}
        <div style={{ background: T.bg, borderRadius:"16px", border:`1px solid ${T.border}`, overflow:"hidden" }}>
          <div style={{ padding:"24px 28px", minHeight:"400px" }}>
            <EditorContent editor={editor} />
          </div>
          <NoteStats editor={editor} savedAt={savedAt} />
        </div>
      </div>

      {/* Version History Modal */}
      {showHistory && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"16px" }}
          onClick={(e) => e.target===e.currentTarget && setShowHistory(false)}>
          <div style={{ background: T.modalBg, border:`1px solid ${T.modalBdr}`, borderRadius:"20px", padding:"24px", width:"100%", maxWidth:"480px", maxHeight:"70vh", display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <h3 style={{ color: T.text, fontSize:"15px", fontWeight:600, margin:0 }}>🕐 Version History</h3>
              <button onClick={() => setShowHistory(false)} style={{ background:"none", border:"none", color: T.text3, cursor:"pointer", fontSize:"18px" }}>✕</button>
            </div>
            <div style={{ overflowY:"auto", flex:1 }}>
              {versions.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px", color: T.text4, fontSize:"13px" }}>
                  No versions yet — auto-saved every 2 minutes
                </div>
              ) : versions.map((v) => (
                <div key={v.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:"12px", marginBottom:"6px", border:`1px solid ${T.border}`, background: T.bg3 }}>
                  <div>
                    <div style={{ fontSize:"13px", color: T.text, marginBottom:"3px" }}>{new Date(v.savedAt).toLocaleString()}</div>
                    <div style={{ fontSize:"11px", color: T.text4, fontFamily:"monospace" }}>{v.wordCount} words</div>
                  </div>
                  <button onClick={() => restoreVersion(v)}
                    style={{ fontSize:"12px", padding:"5px 12px", borderRadius:"8px", background:"rgba(124,58,237,0.15)", border:"1px solid rgba(124,58,237,0.3)", color:"#a78bfa", cursor:"pointer" }}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"16px" }}
          onClick={(e) => e.target===e.currentTarget && setShowShare(false)}>
          <div style={{ background: T.modalBg, border:`1px solid ${T.modalBdr}`, borderRadius:"20px", padding:"24px", width:"100%", maxWidth:"420px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
              <h3 style={{ color: T.text, fontSize:"15px", fontWeight:600, margin:0 }}>🔗 Share Note</h3>
              <button onClick={() => setShowShare(false)} style={{ background:"none", border:"none", color: T.text3, cursor:"pointer", fontSize:"18px" }}>✕</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background: T.bg3, borderRadius:"12px", padding:"14px 16px", marginBottom:"14px", border:`1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize:"13px", color: T.text, fontWeight:500 }}>Public link</div>
                <div style={{ fontSize:"11px", color: T.text3, marginTop:"2px" }}>Anyone with the link can view</div>
              </div>
              <button onClick={() => setIsPublic((p) => !p)}
                style={{ width:"44px", height:"24px", borderRadius:"12px", background:isPublic?"#7c3aed": T.border2, border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                <span style={{ position:"absolute", top:"3px", left:isPublic?"23px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:"white", transition:"left 0.2s" }} />
              </button>
            </div>
            {isPublic && shareUrl && (
              <div style={{ display:"flex", gap:"8px", marginBottom:"14px" }}>
                <input readOnly value={shareUrl} style={{ flex:1, background: T.inputBg, border:`1px solid ${T.border}`, borderRadius:"8px", padding:"8px 12px", fontSize:"11px", fontFamily:"monospace", color: T.text3, outline:"none" }} />
                <button onClick={() => { navigator.clipboard.writeText(shareUrl); setShareMsg("✅ Copied!"); }}
                  style={{ padding:"8px 14px", background:"#7c3aed", border:"none", borderRadius:"8px", fontSize:"12px", color:"white", cursor:"pointer", fontWeight:600 }}>
                  Copy
                </button>
              </div>
            )}
            <div style={{ marginBottom:"14px" }}>
              <label style={{ display:"block", fontSize:"11px", color: T.text4, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px" }}>Invite by email</label>
              <div style={{ display:"flex", gap:"8px" }}>
                <input type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  style={{ flex:1, background: T.inputBg, border:`1px solid ${T.border}`, borderRadius:"8px", padding:"8px 12px", fontSize:"13px", color: T.inputC, outline:"none", fontFamily:"monospace" }}
                  onFocus={(e) => e.currentTarget.style.borderColor="#7c3aed"}
                  onBlur={(e) => e.currentTarget.style.borderColor= T.border} />
                <button onClick={handleShare}
                  style={{ padding:"8px 16px", background:"#7c3aed", border:"none", borderRadius:"8px", fontSize:"12px", color:"white", cursor:"pointer", fontWeight:600 }}>
                  Invite
                </button>
              </div>
            </div>
            {shareMsg && <div style={{ fontSize:"12px", textAlign:"center", color: T.text2, marginBottom:"10px" }}>{shareMsg}</div>}
            <button onClick={handleShare}
              style={{ width:"100%", padding:"10px", background:"#7c3aed", border:"none", borderRadius:"12px", fontSize:"13px", color:"white", cursor:"pointer", fontWeight:600 }}
              onMouseEnter={(e) => e.currentTarget.style.background="#6d28d9"}
              onMouseLeave={(e) => e.currentTarget.style.background="#7c3aed"}>
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}