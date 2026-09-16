/**
 * @title Editor surface
 * @notice CodeMirror 6 surface: line numbers, selection, and syntax highlighting,
 * themed entirely from the active palette.
 * @dev The highlight style paints with the theme's ANSI CSS variables, so
 * switching themes recolors code without rebuilding the view. The mapping reads
 * like a terminal usually does: keywords magenta, strings green, numbers yellow,
 * comments italic bright-black, types cyan, functions and properties blue.
 */
import { useEffect, useRef } from "react";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { tags as t } from "@lezer/highlight";
import { basicSetup } from "codemirror";
import type { Extension } from "@codemirror/state";
import "./EditorSurface.css";

const SYNTAX_STYLE = HighlightStyle.define([
  { tag: [t.keyword, t.modifier], color: "var(--ansi-5)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--ansi-2)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--ansi-3)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--ansi-8)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--ansi-6)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: "var(--ansi-4)" },
  { tag: [t.propertyName, t.attributeName], color: "var(--ansi-4)" },
  { tag: [t.tagName], color: "var(--ansi-1)" },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: "var(--ansi-7)" },
  { tag: [t.heading], color: "var(--ansi-4)", fontWeight: "600" },
  { tag: [t.strong], fontWeight: "600" },
  { tag: [t.emphasis], fontStyle: "italic" },
  { tag: [t.link, t.url], color: "var(--ansi-4)", textDecoration: "underline" },
]);

const EDITOR_THEME = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontSize: "13px",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "20px",
  },
  ".cm-content": {
    caretColor: "var(--ansi-cursor)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--ansi-cursor)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--ansi-selection)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--background)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--foreground)",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
});

/** Language support picked from the file extension. */
function languageFor(path: string): Extension {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  switch (extension) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return javascript({ jsx: true });
    case "ts":
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "json":
      return json();
    case "md":
    case "markdown":
      return markdown();
    case "rs":
      return rust();
    case "py":
      return python();
    default:
      return [];
  }
}

export interface EditorSurfaceProps {
  /** Absolute file path; drives the language and the save shortcut. */
  path: string;
  /** Document content loaded once, when the surface mounts. */
  value: string;
  /** Called on every edit with the new document. */
  onChange: (value: string) => void;
  /** Called for Ctrl/Cmd+S. */
  onSave: () => void;
}

export function EditorSurface({ path, value, onChange, onSave }: EditorSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handlersRef = useRef({ onChange, onSave });
  handlersRef.current = { onChange, onSave };

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          languageFor(path),
          syntaxHighlighting(SYNTAX_STYLE),
          EDITOR_THEME,
          keymap.of([
            {
              key: "Mod-s",
              preventDefault: true,
              run: () => {
                handlersRef.current.onSave();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              handlersRef.current.onChange(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    return () => {
      view.destroy();
    };
    // Mount-only on purpose: one tab instance owns one file, and the document is
    // handed to CodeMirror exactly once (later edits flow through onChange).
  }, []);

  return <div className="editor-surface" ref={containerRef} />;
}
