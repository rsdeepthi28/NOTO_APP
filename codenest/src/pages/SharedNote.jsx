import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SharedNote() {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [error, setError] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight],
    content: "<p></p>",
    editable: false,
    editorProps: {
      attributes: { class: "prose prose-invert prose-sm max-w-none focus:outline-none text-gray-200" },
    },
  });

  useEffect(() => {
    fetch(`${API}/shared/${token}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        setNote(data);
        const html = data.content?.html || "<p>Empty note.</p>";
        editor?.commands.setContent(html);
      })
      .catch(() => setError(true));
  }, [token, editor]);

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200">
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center justify-between">
        <div className="font-mono text-sm text-violet-400">⟨ CodeNest /⟩</div>
        <span className="text-xs text-gray-600 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
          View only
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {error ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-30">🔒</div>
            <div className="text-gray-500 text-lg mb-2">Note not found or not public</div>
            <Link to="/" className="text-violet-400 hover:text-violet-300 text-sm">Go to CodeNest →</Link>
          </div>
        ) : note ? (
          <>
            <h1 className="text-3xl font-bold text-white mb-2">{note.title}</h1>
            {(note.tags || []).length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {note.tags.map((t) => (
                  <span key={t} className="text-xs bg-violet-900/30 text-violet-400 border border-violet-800/40 px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-600 font-mono mb-8">
              {note.created_at ? new Date(note.created_at).toLocaleString() : ""}
            </p>
            <div className="h-px bg-gray-800 mb-8" />
            <EditorContent editor={editor} />
          </>
        ) : (
          <div className="text-gray-600 text-sm animate-pulse">Loading…</div>
        )}
      </div>
    </div>
  );
}