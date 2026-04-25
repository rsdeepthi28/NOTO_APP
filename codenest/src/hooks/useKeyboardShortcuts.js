import { useEffect } from "react";

/**
 * useKeyboardShortcuts
 * @param {Object} shortcuts - map of "mod+key" → handler fn
 *
 * mod = Ctrl on Windows/Linux, Cmd on Mac
 *
 * Example:
 *   useKeyboardShortcuts({
 *     "mod+s": () => saveNote(),
 *     "mod+/": () => insertCodeBlock(),
 *   });
 */
export default function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    function handler(e) {
      const mod = e.ctrlKey || e.metaKey;

      for (const [combo, fn] of Object.entries(shortcuts)) {
        const parts = combo.toLowerCase().split("+");
        const needsMod = parts.includes("mod");
        const needsShift = parts.includes("shift");
        const key = parts[parts.length - 1];

        if (needsMod && !mod) continue;
        if (needsShift && !e.shiftKey) continue;
        if (e.key.toLowerCase() !== key) continue;

        e.preventDefault();
        fn();
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
