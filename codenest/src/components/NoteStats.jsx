import { useMemo } from "react";

export default function NoteStats({ editor, savedAt }) {
  const stats = useMemo(() => {
    if (!editor) return { words: 0, chars: 0, readTime: 0, codeBlocks: 0 };

    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));

    // Count code execution blocks
    let codeBlocks = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "codeExecution") codeBlocks++;
    });

    return { words, chars, readTime, codeBlocks };
  }, [editor?.state.doc]);

  const items = [
    { label: "words",       value: stats.words },
    { label: "chars",       value: stats.chars },
    { label: "min read",    value: stats.readTime },
    { label: "code blocks", value: stats.codeBlocks },
    ...(savedAt ? [{ label: "saved", value: new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] : []),
  ];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "8px 16px",
      background: "#111318",
      borderTop: "1px solid #1e2030",
      flexWrap: "wrap",
    }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace", fontWeight: 600 }}>
            {item.value}
          </span>
          <span style={{ fontSize: "11px", color: "#374151", fontFamily: "monospace" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
