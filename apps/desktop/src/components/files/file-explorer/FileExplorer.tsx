/**
 * @title File explorer
 * @notice Files panel: search field, a Files header (new folder, new file,
 * refresh), the tree of the open folder, and a right-click menu with the usual
 * explorer actions.
 * @dev Children are listed on demand through the backend `read_dir` command, so
 * huge folders only cost when opened. New entries land in the folder you last
 * clicked — the name field appears inline right under it, like VS Code — and rows
 * can be dragged onto a folder to move them. Cut entries stay dimmed until a
 * Paste resolves them. Refresh bumps a token that re-lists every open folder
 * without collapsing the tree.
 */
import { useEffect, useState } from "react";
import { FilePlus } from "@phosphor-icons/react";
import { ask } from "@tauri-apps/plugin-dialog";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import {
  copyEntry,
  createEntry,
  deleteEntry,
  listDirectory,
  moveEntry,
  searchFiles,
  trashEntry,
} from "../../../files/directory";
import type { DirEntry } from "../../../files/directory";
import {
  clearFileClipboard,
  setFileClipboard,
  useFileClipboard,
} from "../../../files/clipboard";
import { folderName } from "../../../files/path";
import { openFileTab, openTerminal } from "../../../terminal/sessions";
import { useWorkspace } from "../../../workspace/workspace";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { ContextMenu } from "../../ui/context-menu/ContextMenu";
import type { ContextMenuItem } from "../../ui/context-menu/ContextMenu";
import { FileSearch } from "../file-search/FileSearch";
import "./FileExplorer.css";

/** Path shown relative to the workspace root, for search results. */
function relativeTo(root: string, path: string): string {
  for (const separator of ["/", "\\"]) {
    const prefix = root.endsWith(separator) ? root : `${root}${separator}`;
    if (path.startsWith(prefix)) {
      return path.slice(prefix.length);
    }
  }
  return path;
}

/** Joins a folder and a name with a separator both POSIX and Windows accept. */
function joinPath(folder: string, name: string): string {
  const separator = folder.endsWith("/") || folder.endsWith("\\") ? "" : "/";
  return `${folder}${separator}${name}`;
}

/** Parent folder of a path, handling both separators. */
function parentOf(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index <= 0 ? path : path.slice(0, index);
}

/** Whether `path` is `folder` itself or sits inside it. */
function isInside(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`) || path.startsWith(`${folder}\\`);
}

/** Name for a duplicate: `note.md` becomes `note copy.md`. */
function duplicateName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0
    ? `${name.slice(0, dot)} copy${name.slice(dot)}`
    : `${name} copy`;
}

interface Draft {
  /** Create a new entry, or rename an existing one. */
  mode: "create" | "rename";
  /** Folder new entries go into. */
  targetDir: string;
  /** Entry being renamed (rename mode only). */
  from?: string;
  /** Kind for create mode. */
  kind: "folder" | "file";
  /** Current input text. */
  value: string;
}

interface TreeHandlers {
  /** Marks a folder as the target for new entries. */
  select: (path: string) => void;
  /** Folder new entries currently land in. */
  selected: string | null;
  /** Moves a dragged entry into a folder. */
  dropInto: (targetDir: string, from: string) => void;
  /** Opens the context menu at a pointer position. */
  openMenu: (x: number, y: number, entry: DirEntry | null) => void;
  /** Inline name field state, or null when closed. */
  draft: Draft | null;
  /** Updates the inline name field. */
  setDraftValue: (value: string) => void;
  /** Submits the inline name field. */
  submitDraft: () => void;
  /** Closes the inline name field. */
  cancelDraft: () => void;
  /** Path of the entry held by cut, for dimming. */
  cutPath: string | null;
}

interface NodeProps {
  entry: DirEntry;
  depth: number;
  refreshToken: number;
  tree: TreeHandlers;
}

/** Whether the inline name field belongs to this entry. */
function ownsDraft(draft: Draft | null, path: string): boolean {
  if (draft === null) {
    return false;
  }
  return draft.mode === "rename" ? draft.from === path : draft.targetDir === path;
}

function DraftRow({ depth, tree }: { depth: number; tree: TreeHandlers }) {
  const draft = tree.draft;
  if (draft === null) {
    return null;
  }
  return (
    <div className="file-explorer__draft" style={{ paddingLeft: 8 + depth * 12 }}>
      <input
        autoFocus
        className="file-explorer__draft-input"
        placeholder={draft.kind === "folder" ? "Folder name" : "File name"}
        aria-label={draft.mode === "rename" ? "New name" : "New entry name"}
        value={draft.value}
        onChange={(event) => tree.setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            tree.submitDraft();
          }
          if (event.key === "Escape") {
            tree.cancelDraft();
          }
        }}
        onBlur={tree.cancelDraft}
      />
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`file-explorer__chevron${open ? " file-explorer__chevron--open" : ""}`}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DirectoryNode({ entry, depth, refreshToken, tree }: NodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = async () => {
    try {
      setChildren(await listDirectory(entry.path));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  // Refresh re-lists folders that are already open, keeping the tree shape.
  useEffect(() => {
    if (expanded) {
      void load();
    }
  }, [refreshToken]);

  // A draft targeting this folder opens it, so the field is visible at once.
  useEffect(() => {
    if (tree.draft?.mode === "create" && tree.draft.targetDir === entry.path) {
      setExpanded(true);
    }
  }, [tree.draft]);

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    tree.select(entry.path);
    if (next && children === null) {
      await load();
    }
  };

  return (
    <>
      <button
        type="button"
        className="file-explorer__row"
        style={{ paddingLeft: 8 + depth * 12 }}
        aria-expanded={expanded}
        data-selected={tree.selected === entry.path}
        data-drag-over={dragOver}
        data-cut={tree.cutPath === entry.path}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", entry.path);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          tree.dropInto(entry.path, event.dataTransfer.getData("text/plain"));
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          tree.openMenu(event.clientX, event.clientY, entry);
        }}
        onClick={() => void toggle()}
      >
        <Chevron open={expanded} />
        <MaskIcon src="/assets/icons/folder.svg" />
        <span className="file-explorer__name">{entry.name}</span>
      </button>
      {tree.draft?.mode === "rename" && tree.draft.from === entry.path && (
        <DraftRow depth={depth} tree={tree} />
      )}
      {expanded && ownsDraft(tree.draft, entry.path) && (
        <DraftRow depth={depth + 1} tree={tree} />
      )}
      {expanded &&
        children?.map((child) =>
          child.isDir ? (
            <DirectoryNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              refreshToken={refreshToken}
              tree={tree}
            />
          ) : (
            <FileNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              refreshToken={refreshToken}
              tree={tree}
            />
          ),
        )}
      {expanded && children?.length === 0 && (
        <p className="file-explorer__empty" style={{ paddingLeft: 8 + (depth + 1) * 12 }}>
          Folder is empty.
        </p>
      )}
      {expanded && error !== null && (
        <p className="file-explorer__error" style={{ paddingLeft: 8 + (depth + 1) * 12 }}>
          {error}
        </p>
      )}
    </>
  );
}

function FileNode({ entry, depth, tree }: NodeProps) {
  return (
    <>
      <button
        type="button"
        className="file-explorer__row"
        style={{ paddingLeft: 8 + depth * 12 }}
        title={entry.path}
        data-cut={tree.cutPath === entry.path}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", entry.path);
          event.dataTransfer.effectAllowed = "move";
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          tree.openMenu(event.clientX, event.clientY, entry);
        }}
        onClick={() => openFileTab(entry.path)}
      >
        <span className="file-explorer__chevron" aria-hidden="true" />
        <MaskIcon src="/assets/icons/file.svg" />
        <span className="file-explorer__name">{entry.name}</span>
      </button>
      {tree.draft?.mode === "rename" && tree.draft.from === entry.path && (
        <DraftRow depth={depth} tree={tree} />
      )}
    </>
  );
}

export function FileExplorer() {
  const { root } = useWorkspace();
  const clipboard = useFileClipboard();
  const [entries, setEntries] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirEntry[] | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; entry: DirEntry | null } | null>(
    null,
  );

  useEffect(() => {
    if (root === null || query.trim().length === 0) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchFiles(root, query)
        .then((next) => {
          if (!cancelled) {
            setResults(next);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
          }
        });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [root, query]);

  useEffect(() => {
    if (root === null) {
      setEntries(null);
      setError(null);
      setSelectedDir(null);
      setDraft(null);
      return;
    }
    let cancelled = false;
    setEntries(null);
    setError(null);
    setSelectedDir(null);
    setDraft(null);
    listDirectory(root)
      .then((next) => {
        if (!cancelled) {
          setEntries(next);
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
  }, [root, refreshToken]);

  const refresh = () => {
    setRefreshToken((token) => token + 1);
  };

  const startCreate = (kind: "folder" | "file", targetDir: string) => {
    setSelectedDir(targetDir);
    setDraft({ mode: "create", kind, targetDir, value: "" });
  };

  const submitDraft = async () => {
    if (draft === null) {
      return;
    }
    const name = draft.value.trim();
    if (name === "") {
      return;
    }
    try {
      if (draft.mode === "create") {
        await createEntry(joinPath(draft.targetDir, name), draft.kind === "folder");
      } else if (draft.from !== undefined) {
        await moveEntry(draft.from, joinPath(draft.targetDir, name));
      }
      setDraft(null);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const dropInto = async (targetDir: string, from: string) => {
    if (from === "") {
      return;
    }
    const to = joinPath(targetDir, folderName(from));
    // Dropping back where it already lives, or into its own subtree, is a no-op.
    if (to === from || isInside(targetDir, from)) {
      return;
    }
    try {
      await moveEntry(from, to);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const pasteInto = async (targetDir: string) => {
    if (clipboard === null) {
      return;
    }
    const to = joinPath(targetDir, folderName(clipboard.path));
    try {
      if (clipboard.mode === "cut") {
        if (to === clipboard.path) {
          return;
        }
        await moveEntry(clipboard.path, to);
        clearFileClipboard();
      } else {
        await copyEntry(clipboard.path, to);
      }
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const duplicate = async (path: string) => {
    try {
      await copyEntry(path, joinPath(parentOf(path), duplicateName(folderName(path))));
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const moveToTrash = async (path: string) => {
    if (!isTauri()) {
      return;
    }
    try {
      await trashEntry(path);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const removeEntry = async (path: string) => {
    if (!isTauri()) {
      return;
    }
    const confirmed = await ask(`Permanently delete "${folderName(path)}"?`, {
      title: "Delete",
      kind: "warning",
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteEntry(path);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const copyText = (value: string) => {
    void navigator.clipboard.writeText(value).catch(() => {
      // Clipboard access can be denied; the action silently does nothing then.
    });
  };

  const menuItems = (entry: DirEntry | null): ContextMenuItem[] => {
    const isFolder = entry !== null && entry.isDir;
    const targetDir =
      entry === null
        ? (selectedDir ?? root ?? "")
        : isFolder
          ? entry.path
          : parentOf(entry.path);
    const path = entry?.path ?? "";
    return [
      { id: "new-file", label: "New File", onSelect: () => startCreate("file", targetDir) },
      {
        id: "new-folder",
        label: "New Folder",
        onSelect: () => startCreate("folder", targetDir),
      },
      {
        id: "reveal",
        label: "Reveal in File Manager",
        separatorBefore: true,
        disabled: entry === null,
        onSelect: () => void revealItemInDir(path).catch(() => undefined),
      },
      {
        id: "open-app",
        label: "Open in Default App",
        disabled: entry === null,
        onSelect: () => void openPath(path).catch(() => undefined),
      },
      {
        id: "open-terminal",
        label: "Open in Terminal",
        onSelect: () => openTerminal(targetDir, null),
      },
      { id: "md-preview", label: "Open Markdown Preview", disabled: true },
      {
        id: "cut",
        label: "Cut",
        separatorBefore: true,
        disabled: entry === null,
        onSelect: () => setFileClipboard("cut", path),
      },
      {
        id: "copy",
        label: "Copy",
        disabled: entry === null,
        onSelect: () => setFileClipboard("copy", path),
      },
      {
        id: "duplicate",
        label: "Duplicate",
        disabled: entry === null,
        onSelect: () => void duplicate(path),
      },
      {
        id: "paste",
        label: "Paste",
        disabled: clipboard === null,
        onSelect: () => void pasteInto(targetDir),
      },
      { id: "undo", label: "Undo", separatorBefore: true, disabled: true },
      { id: "redo", label: "Redo", disabled: true },
      {
        id: "copy-path",
        label: "Copy Path",
        separatorBefore: true,
        disabled: entry === null,
        onSelect: () => copyText(path),
      },
      {
        id: "copy-relative",
        label: "Copy Relative Path",
        disabled: entry === null,
        onSelect: () => copyText(relativeTo(root ?? "", path)),
      },
      {
        id: "rename",
        label: "Rename",
        separatorBefore: true,
        disabled: entry === null,
        onSelect: () => {
          if (entry === null) {
            return;
          }
          setDraft({
            mode: "rename",
            kind: entry.isDir ? "folder" : "file",
            targetDir: parentOf(entry.path),
            from: entry.path,
            value: entry.name,
          });
        },
      },
      {
        id: "trash",
        label: "Trash",
        disabled: entry === null,
        onSelect: () => void moveToTrash(path),
      },
      {
        id: "delete",
        label: "Delete",
        disabled: entry === null,
        onSelect: () => void removeEntry(path),
      },
    ];
  };

  const tree: TreeHandlers = {
    select: setSelectedDir,
    selected: selectedDir,
    dropInto: (targetDir, from) => {
      void dropInto(targetDir, from);
    },
    openMenu: (x, y, entry) => setMenu({ x, y, entry }),
    draft,
    setDraftValue: (value) => setDraft((current) => (current === null ? null : { ...current, value })),
    submitDraft: () => void submitDraft(),
    cancelDraft: () => setDraft(null),
    cutPath: clipboard?.mode === "cut" ? clipboard.path : null,
  };

  if (root === null) {
    // Nothing open yet: the field stays, disabled, so the panel is not blank.
    return (
      <div className="file-explorer">
        <FileSearch value={query} onChange={setQuery} disabled />
      </div>
    );
  }

  return (
    <div
      className="file-explorer"
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY, entry: null });
      }}
    >
      <div className="file-explorer__top">
        <FileSearch value={query} onChange={setQuery} />

        <div className="file-explorer__actions">
          <h2 className="file-explorer__heading">
            Files
            <span className="file-explorer__divider" aria-hidden="true" />
          </h2>
          <button
            type="button"
            className="file-explorer__action"
            title="New folder"
            aria-label="New folder"
            onClick={() => startCreate("folder", selectedDir ?? root)}
          >
            <MaskIcon src="/assets/icons/folder_add.svg" />
          </button>
          <button
            type="button"
            className="file-explorer__action"
            title="New file"
            aria-label="New file"
            onClick={() => startCreate("file", selectedDir ?? root)}
          >
            <FilePlus size={16} />
          </button>
          <button
            type="button"
            className="file-explorer__action"
            title="Refresh"
            aria-label="Refresh"
            onClick={refresh}
          >
            <MaskIcon src="/assets/icons/refresh_title.svg" />
          </button>
        </div>
      </div>

      {error !== null && <p className="file-explorer__error">{error}</p>}

      {results !== null ? (
        <div className="file-explorer__results">
          {results.length === 0 && <p className="file-explorer__empty">No matches.</p>}
          {results.map((entry) => (
            <button
              type="button"
              className="file-explorer__result"
              key={entry.path}
              title={entry.path}
              onClick={() => openFileTab(entry.path)}
            >
              <MaskIcon src={entry.isDir ? "/assets/icons/folder.svg" : "/assets/icons/file.svg"} />
              <span className="file-explorer__name">{relativeTo(root, entry.path)}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {ownsDraft(draft, root) && <DraftRow depth={0} tree={tree} />}
          {entries === null && error === null && <p className="file-explorer__empty">Loading…</p>}
          {entries?.length === 0 && <p className="file-explorer__empty">Folder is empty.</p>}
          {entries?.map((entry) =>
            entry.isDir ? (
              <DirectoryNode
                key={entry.path}
                entry={entry}
                depth={0}
                refreshToken={refreshToken}
                tree={tree}
              />
            ) : (
              <FileNode
                key={entry.path}
                entry={entry}
                depth={0}
                refreshToken={refreshToken}
                tree={tree}
              />
            ),
          )}
        </>
      )}

      {menu !== null && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems(menu.entry)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
