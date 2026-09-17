/**
 * @title Terminal sessions
 * @notice Tabs of the center panel, plus which one is active.
 * @dev Despite the terminal-flavoured names, a tab is one of three kinds: a
 * terminal (`path` is null), a file editor, or a commit diff — the diff kind
 * keeps the repo root in `path` and the hash in `commit`. Each tab owns its
 * cwd/shell, file, or view, so switching tabs never loses state. Opening a
 * folder starts the first terminal automatically, and the + button opens more.
 * Tabs carry an automatic label that a rename can replace (and a blank rename
 * restores). The git history list is not a tab: it replaces the file tree in
 * the Files panel.
 */
import { useSyncExternalStore } from "react";
import { folderName } from "../files/path";
import { getWorkspaceRoot, subscribeWorkspace } from "../workspace/workspace";

/** What a tab shows. */
export type TabKind = "terminal" | "editor" | "diff";

export interface TerminalSession {
  /** Stable session id, also the PTY key for terminal tabs. */
  id: string;
  /** What this tab renders. */
  kind: TabKind;
  /** Folder the shell starts in, or null for the process default. */
  cwd: string | null;
  /** Shell picked in the + menu, or null for the platform default. */
  shell: string | null;
  /** Tab label. */
  label: string;
  /** File path for editor tabs, repo root for git tabs; null for terminals. */
  path: string | null;
  /** Editor tabs only: code editor or rendered preview. */
  mode: TabMode;
  /** Diff tabs only: full commit hash. */
  commit: string | null;
}

/** Which view an editor tab shows. */
export type TabMode = "code" | "preview";

/** Whether a tab runs a shell rather than showing content. */
export function isTerminalTab(session: TerminalSession): boolean {
  return session.kind === "terminal";
}

function labelFor(cwd: string | null): string {
  return cwd === null ? "Terminal" : folderName(cwd);
}

/** Automatic tab name: the file, the commit, the shell it runs, or the folder. */
function defaultLabel(session: TerminalSession): string {
  if (session.kind === "diff") {
    return (session.commit ?? "").slice(0, 7);
  }
  if (session.path !== null) {
    return folderName(session.path);
  }
  // A profile tab is named after the shell it runs, a plain tab after the
  // project folder — so the two kinds are told apart at a glance.
  return session.shell === null ? labelFor(session.cwd) : folderName(session.shell);
}

let counter = 0;

function createSession(cwd: string | null, shell: string | null): TerminalSession {
  counter += 1;
  const session: TerminalSession = {
    id: `terminal-${Date.now()}-${counter}`,
    kind: "terminal",
    cwd,
    shell,
    label: "",
    path: null,
    mode: "code",
    commit: null,
  };
  return { ...session, label: defaultLabel(session) };
}

let sessions: TerminalSession[] = [];
let activeId = "";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Subscribes React to the session list.
 * @return The sessions in tab order.
 */
export function useTerminalSessions(): TerminalSession[] {
  return useSyncExternalStore(subscribe, () => sessions);
}

/**
 * @notice Subscribes React to the active tab id, whatever kind it is.
 * @dev Use this for highlighting and visibility; {@link useActiveTerminalId} is
 * for anything that must only target shells (quick actions, PTY plumbing).
 * @return The active tab id, or an empty string when nothing is open.
 */
export function useActiveTabId(): string {
  return useSyncExternalStore(subscribe, () => activeId);
}

/**
 * @notice Subscribes React to the active session id.
 * @return The active terminal id, or an empty string when an editor tab is active.
 */
export function useActiveTerminalId(): string {
  return useSyncExternalStore(subscribe, () => {
    const session = sessions.find((candidate) => candidate.id === activeId);
    return session !== undefined && isTerminalTab(session) ? session.id : "";
  });
}

/**
 * @notice Opens a session in the given folder and activates it.
 * @param cwd Folder for the new shell, or null for the process default.
 * @param shell Shell picked in the + menu, or null for the platform default.
 * @return The new session id.
 */
export function openTerminal(cwd: string | null, shell: string | null = null): string {
  const session = createSession(cwd, shell);
  sessions = [...sessions, session];
  activeId = session.id;
  notify();
  return session.id;
}

/**
 * @notice Activates a session.
 * @param id Session id; unknown ids are ignored.
 */
export function setActiveTerminal(id: string): void {
  if (id === activeId || !sessions.some((session) => session.id === id)) {
    return;
  }
  activeId = id;
  notify();
}

/**
 * @notice Renames a tab.
 * @dev Blank names restore the automatic label, so a tab is never nameless.
 * @param id Tab id; unknown ids are ignored.
 * @param label New name.
 */
export function renameSession(id: string, label: string): void {
  const session = sessions.find((candidate) => candidate.id === id);
  if (session === undefined) {
    return;
  }
  const trimmed = label.trim();
  const next = trimmed === "" ? defaultLabel(session) : trimmed;
  if (next === session.label) {
    return;
  }
  sessions = sessions.map((candidate) =>
    candidate.id === id ? { ...candidate, label: next } : candidate,
  );
  notify();
}

/**
 * @notice Closes a session and activates a neighbour.
 * @dev Closing the last tab leaves the panel empty; the + button starts a new
 * session.
 * @param id Session id to close.
 */
export function closeTerminal(id: string): void {
  const index = sessions.findIndex((session) => session.id === id);
  if (index === -1) {
    return;
  }
  sessions = sessions.filter((session) => session.id !== id);
  if (activeId === id) {
    const neighbour = sessions[Math.min(index, sessions.length - 1)];
    activeId = neighbour === undefined ? "" : neighbour.id;
  }
  notify();
}

/**
 * @notice Reads the active session id without subscribing.
 * @dev For plain modules (commands, keymap actions) that must not call hooks.
 * @return The active terminal id, or an empty string when no terminal tab is active.
 */
export function getActiveTerminalId(): string {
  const session = sessions.find((candidate) => candidate.id === activeId);
  return session !== undefined && isTerminalTab(session) ? session.id : "";
}

/**
 * @notice Opens a file in a new tab, or focuses the tab already showing it.
 * @param path Absolute file path.
 * @param mode Which view to show first (code or preview).
 * @return The editor tab's id.
 */
export function openFileTab(path: string, mode: TabMode = "code"): string {
  const existing = sessions.find((session) => session.kind === "editor" && session.path === path);
  if (existing !== undefined) {
    setActiveTerminal(existing.id);
    setTabMode(existing.id, mode);
    return existing.id;
  }
  counter += 1;
  const session: TerminalSession = {
    id: `file-${Date.now()}-${counter}`,
    kind: "editor",
    cwd: null,
    shell: null,
    label: folderName(path),
    path,
    mode,
    commit: null,
  };
  sessions = [...sessions, session];
  activeId = session.id;
  notify();
  return session.id;
}

/**
 * @notice Opens one commit's diff, or focuses the tab already showing it.
 * @param root Folder the commit belongs to.
 * @param commit Full commit hash.
 * @return The diff tab's id.
 */
export function openCommitDiffTab(root: string, commit: string): string {
  const existing = sessions.find(
    (session) =>
      session.kind === "diff" && session.path === root && session.commit === commit,
  );
  if (existing !== undefined) {
    setActiveTerminal(existing.id);
    return existing.id;
  }
  counter += 1;
  const session: TerminalSession = {
    id: `diff-${Date.now()}-${counter}`,
    kind: "diff",
    cwd: null,
    shell: null,
    label: commit.slice(0, 7),
    path: root,
    mode: "code",
    commit,
  };
  sessions = [...sessions, session];
  activeId = session.id;
  notify();
  return session.id;
}

/**
 * @notice Switches an editor tab between the code editor and the preview.
 * @param id Tab id; unknown ids are ignored.
 * @param mode View to show.
 */
export function setTabMode(id: string, mode: TabMode): void {
  const index = sessions.findIndex((session) => session.id === id);
  if (index === -1 || sessions[index].mode === mode) {
    return;
  }
  sessions = sessions.map((session, position) =>
    position === index ? { ...session, mode } : session,
  );
  notify();
}

/**
 * @notice Closes every tab except the given one, which becomes active.
 * @param id Session to keep; unknown ids are ignored.
 */
export function closeOtherTerminals(id: string): void {
  const keep = sessions.find((session) => session.id === id);
  if (keep === undefined) {
    return;
  }
  sessions = [keep];
  activeId = keep.id;
  notify();
}

/**
 * @notice Closes every tab.
 */
export function closeAllTerminals(): void {
  if (sessions.length === 0) {
    return;
  }
  sessions = [];
  activeId = "";
  notify();
}

// Opening a folder starts a terminal in it, unless tabs are already open.
let lastRoot = getWorkspaceRoot();
subscribeWorkspace(() => {
  const root = getWorkspaceRoot();
  if (root === lastRoot) {
    return;
  }
  lastRoot = root;
  if (root !== null && sessions.length === 0) {
    openTerminal(root);
  }
});
