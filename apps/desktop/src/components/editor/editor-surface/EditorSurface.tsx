/**
 * @title Editor surface
 * @notice CodeMirror 6 surface: line numbers, selection, and syntax highlighting,
 * themed entirely from the active palette.
 * @dev Colors come from `syntax-style.ts`. The grammar for the file arrives
 * after the view exists — see `languages.ts` — and is appended to the live
 * state, so a slow first-time parser never delays showing the file, and a
 * grammar that cannot be fetched leaves it as plain text.
 */
import { useEffect, useRef } from "react";
import { syntaxHighlighting } from "@codemirror/language";
import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { languageFor } from "./languages";
import { SYNTAX_STYLE } from "./syntax-style";
import "./EditorSurface.css";

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
    let disposed = false;
    void languageFor(path)
      .then((support) => {
        if (!disposed && support !== null) {
          view.dispatch({ effects: StateEffect.appendConfig.of(support) });
        }
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      view.destroy();
    };
    // Mount-only on purpose: one tab instance owns one file, and the document is
    // handed to CodeMirror exactly once (later edits flow through onChange).
  }, []);

  return <div className="editor-surface" ref={containerRef} />;
}
