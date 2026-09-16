/**
 * @title Editor view
 * @notice One file opened in a center tab: a bar with the name and path plus a
 * CodeMirror surface carrying line numbers and syntax highlighting.
 * @dev The document is read once (2 MiB cap in the backend) and handed to
 * CodeMirror when it arrives; later edits flow back through `onChange`.
 * Ctrl/Cmd+S saves, and the title shows a dot while the buffer has unsaved
 * changes. Inactive editors stay mounted, so unsaved buffers survive tab switches.
 */
import { useEffect, useState } from "react";
import { readFile, writeFile } from "../../../files/file-content";
import { setTabMode } from "../../../terminal/sessions";
import type { TerminalSession } from "../../../terminal/sessions";
import { EditorSurface } from "../editor-surface/EditorSurface";
import { MarkdownPreview } from "../markdown-preview/MarkdownPreview";
import "./EditorView.css";

export interface EditorViewProps {
  /** Editor tab to render. */
  session: TerminalSession;
  /** Whether this tab is the visible one. */
  active: boolean;
}

export function EditorView({ session, active }: EditorViewProps) {
  const path = session.path ?? "";
  const [contents, setContents] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setContents(null);
    setDirty(false);
    setError(null);
    readFile(path)
      .then((next) => {
        if (!cancelled) {
          setContents(next);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const save = async () => {
    if (contents === null) {
      return;
    }
    try {
      await writeFile(path, contents);
      setDirty(false);
      setSaveError(null);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const directory = path.slice(0, Math.max(0, path.length - session.label.length));
  const isMarkdown = /\.(md|markdown|mdx)$/i.test(path);

  return (
    <div className="editor-view" data-active={active} aria-hidden={!active}>
      <div className="editor-view__bar">
        <span className="editor-view__title">
          {session.label}
          {dirty && (
            <span className="editor-view__dirty" title="Unsaved changes">
              •
            </span>
          )}
        </span>
        <span className="editor-view__path" title={path}>
          {directory === "" ? path : directory}
        </span>
        {isMarkdown && (
          <div className="editor-view__switch" role="group" aria-label="Editor view">
            <button
              type="button"
              className="editor-view__switch-item"
              aria-pressed={session.mode === "code"}
              onClick={() => setTabMode(session.id, "code")}
            >
              Code
            </button>
            <button
              type="button"
              className="editor-view__switch-item"
              aria-pressed={session.mode === "preview"}
              onClick={() => setTabMode(session.id, "preview")}
            >
              View
            </button>
          </div>
        )}
        <button
          type="button"
          className="editor-view__save"
          disabled={!dirty}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>

      {error !== null ? (
        <p className="editor-view__error">{error}</p>
      ) : contents === null ? (
        <p className="editor-view__empty">Loading…</p>
      ) : session.mode === "preview" ? (
        <MarkdownPreview contents={contents} />
      ) : (
        <div className="editor-view__surface">
          <EditorSurface
            path={path}
            value={contents}
            onChange={(next) => {
              setContents(next);
              setDirty(true);
            }}
            onSave={() => void save()}
          />
        </div>
      )}

      {saveError !== null && <p className="editor-view__error">{saveError}</p>}
    </div>
  );
}
