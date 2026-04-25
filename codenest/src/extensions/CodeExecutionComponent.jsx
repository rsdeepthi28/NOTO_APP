import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";

const API = "http://localhost:5000";

const LANGUAGES = [
  { id: 71, label: "Python 3" },
  { id: 63, label: "JavaScript" },
  { id: 54, label: "C++ 17" },
  { id: 62, label: "Java" },
  { id: 50, label: "C" },
];

/* ── React component that renders inside the editor ── */
function CodeExecutionView({ node, updateAttributes, deleteNode }) {
  const [code, setCode] = useState(node.attrs.code || "");
  const [lang, setLang] = useState(node.attrs.lang || 71);
  const [output, setOutput] = useState(node.attrs.output || "");
  const [running, setRunning] = useState(false);
  const [isError, setIsError] = useState(false);

  function handleCodeChange(e) {
    setCode(e.target.value);
    updateAttributes({ code: e.target.value });
  }

  function handleLangChange(e) {
    setLang(Number(e.target.value));
    updateAttributes({ lang: Number(e.target.value) });
  }

  function handleTab(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const newVal = el.value.slice(0, start) + "    " + el.value.slice(start);
      setCode(newVal);
      updateAttributes({ code: newVal });
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
    }
  }

  async function runCode() {
    if (!code.trim()) return;
    setRunning(true);
    setOutput("Running…");
    setIsError(false);

    try {
      const token = localStorage.getItem("cn_token");

const res = await fetch(`${API}/execute`, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ source_code: code, language_id: lang }),
});
      const data = await res.json();
      const result = data.output || data.error || "No output";
      setOutput(result);
      setIsError(!!data.error);
      updateAttributes({ output: result });

      // Save to run history
      const history = JSON.parse(localStorage.getItem("cn_history") || "[]");
      const langLabel = LANGUAGES.find((l) => l.id === lang)?.label || "Code";
      history.unshift({
        id: Date.now().toString(),
        code,
        language: lang,
        langName: langLabel,
        output: result,
        time: new Date().toISOString(),
      });
      localStorage.setItem("cn_history", JSON.stringify(history.slice(0, 50)));
    } catch {
      const err = "Error: Backend not reachable. Make sure server is running on localhost:5000";
      setOutput(err);
      setIsError(true);
      updateAttributes({ output: err });
    }

    setRunning(false);
  }

  const langLabel = LANGUAGES.find((l) => l.id === lang)?.label || "Code";

  return (
    <NodeViewWrapper>
      <div
        className="my-4 rounded-xl border border-gray-700 overflow-hidden bg-gray-900 select-none"
        contentEditable={false}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>

          {/* Language selector */}
          <select
            value={lang}
            onChange={handleLangChange}
            className="bg-gray-700 text-gray-300 text-xs rounded-md px-2 py-1 border border-gray-600 font-mono cursor-pointer outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>

          <span className="text-xs text-gray-600 font-mono">{langLabel}</span>

          {/* Run button */}
          <button
            onClick={runCode}
            disabled={running}
            className={`ml-auto text-xs font-mono px-3 py-1 rounded-md border transition-all ${
              running
                ? "opacity-40 cursor-not-allowed border-gray-600 text-gray-500"
                : "border-green-700 text-green-400 bg-green-900/10 hover:bg-green-900/30 hover:border-green-500"
            }`}
          >
            {running ? "⏳ Running…" : "▶ Run"}
          </button>

          {/* Delete block */}
          <button
            onClick={deleteNode}
            className="text-gray-700 hover:text-red-400 text-xs ml-1 transition-colors"
            title="Remove block"
          >
            ✕
          </button>
        </div>

        {/* Code textarea — contentEditable must be allowed here */}
        <div contentEditable={false}>
          <textarea
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleTab}
            spellCheck={false}
            rows={Math.max(4, code.split("\n").length + 1)}
            placeholder={`# Write your ${langLabel} code here…`}
            className="w-full bg-transparent text-gray-200 font-mono text-sm px-4 py-3 resize-none outline-none leading-relaxed placeholder-gray-700"
            style={{ minHeight: "100px" }}
          />
        </div>

        {/* Output */}
        {output && (
          <div className="border-t border-gray-700 px-4 py-3 bg-gray-950">
            <div className="text-xs text-gray-600 uppercase tracking-widest font-mono mb-1.5">
              Output
            </div>
            <pre
              className={`font-mono text-xs whitespace-pre-wrap leading-relaxed ${
                isError ? "text-red-400" : "text-green-400"
              }`}
            >
              {output}
            </pre>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/* ── Tiptap Node definition ── */
const CodeExecution = Node.create({
  name: "codeExecution",
  group: "block",
  atom: true, // treated as a single unit — cursor goes around it, not inside

  addAttributes() {
    return {
      code: { default: "" },
      lang: { default: 71 },
      output: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='code-execution']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "code-execution" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeExecutionView);
  },
});

export default CodeExecution;