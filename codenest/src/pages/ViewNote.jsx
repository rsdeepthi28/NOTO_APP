import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";

const API = "http://localhost:5000";

export default function ViewNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [noteTitle, setNoteTitle] = useState("Loading…");
  const [createdAt, setCreatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight],
    content: "<p></p>",
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none text-gray-200",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    fetch(`${API}/notes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        const title = data.content?.title || "Untitled";
        const html = data.content?.html || "<p>Empty note.</p>";
        setNoteTitle(title);
        setCreatedAt(data.createdAt || data.updatedAt || null);
        // ✅ FIX: update editor content AFTER it's initialized
        editor.commands.setContent(html);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setNoteTitle("Note not found");
        setLoading(false);
      });
  }, [id, editor]);

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200">
      {/* Topbar */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition">
          ← Dashboard
        </Link>
        <span className="text-gray-700 text-sm flex-1 truncate font-mono">{noteTitle}</span>
        {!loading && !error && (
          <button
            onClick={() => navigate(`/note/edit/${id}`)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-1.5 rounded-lg transition"
          >
            ✏️ Edit
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-gray-600 text-sm animate-pulse">Loading note…</div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-30">📄</div>
            <div className="text-gray-500 text-lg mb-2">Note not found</div>
            <div className="text-gray-600 text-sm mb-6">This note may have been deleted or doesn't exist.</div>
            <Link to="/" className="text-violet-400 hover:text-violet-300 text-sm">
              ← Back to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-3">{noteTitle}</h1>
            {createdAt && (
              <p className="text-xs text-gray-600 font-mono mb-8">
                {new Date(createdAt).toLocaleString()}
              </p>
            )}
            <div className="h-px bg-gray-800 mb-8" />
            <EditorContent editor={editor} />
          </>
        )}
      </div>
    </div>
  );
}