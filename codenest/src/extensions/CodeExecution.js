import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeExecutionComponent from "./CodeExecutionComponent";

const CodeExecution = Node.create({
  name: "codeExecution",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      code: {
        default: "",
      },
      output: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "code-execution" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["code-execution", HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeExecutionComponent);
  },
});

export default CodeExecution;