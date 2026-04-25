import { useEffect, useRef, useState } from "react";

const MAX_VERSIONS = 20;

/**
 * useVersionHistory
 * Saves a snapshot of the note every INTERVAL ms.
 * Returns { versions, saveVersion, restoreVersion, showHistory, setShowHistory }
 */
export default function useVersionHistory(noteId, editor) {
  const INTERVAL = 2 * 60 * 1000; // 2 minutes
  const storageKey = `cn_versions_${noteId}`;
  const [versions, setVersions]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const lastSaved = useRef("");

  // Load versions from localStorage
  useEffect(() => {
    if (!noteId) return;
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    setVersions(stored);
  }, [noteId]);

  function saveVersion() {
    if (!editor || !noteId) return;
    const html = editor.getHTML();
    if (html === lastSaved.current) return; // no change
    lastSaved.current = html;

    const snapshot = {
      id: Date.now(),
      html,
      savedAt: new Date().toISOString(),
      wordCount: editor.getText().trim().split(/\s+/).length,
    };

    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const updated = [snapshot, ...stored].slice(0, MAX_VERSIONS);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setVersions(updated);
  }

  // Auto-snapshot every 2 minutes
  useEffect(() => {
    if (!noteId || !editor) return;
    const t = setInterval(saveVersion, INTERVAL);
    return () => clearInterval(t);
  }, [noteId, editor]);

  function restoreVersion(version) {
    if (!editor) return;
    if (!confirm(`Restore version from ${new Date(version.savedAt).toLocaleString()}? Current content will be replaced.`)) return;
    editor.commands.setContent(version.html);
    setShowHistory(false);
  }

  return { versions, saveVersion, restoreVersion, showHistory, setShowHistory };
}
