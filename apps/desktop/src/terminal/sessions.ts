/**
 * @title Terminal sessions
 * @notice Tabs of the center panel, plus which one is active.
 * @dev Despite the terminal-flavoured names, a tab is either a terminal (`path`
 * is null) or a file editor (`path` is set); renaming this module to `tabs/` is
 * tracked as cleanup. Each tab owns its cwd/shell or its file, so switching tabs
 * never loses state. Opening a folder starts the first terminal automatically,
 * and the + button opens more.
 */
import { useSyncExternalStore } from "react";
import { folderName } from "../files/path";
import { getWorkspaceRoot, subscribeWorkspace } from "../workspace/workspace";

export interface TerminalSession {
  /** Stable session id, also the PTY key for terminal tabs. */
  id: string;
  /** Folder the shell starts in, or null for the process default. */
  cwd: string | null;
  /** Shell picked in the + menu, or null for the platform default. */
  shell: string | null;
  /** Tab label. */
  label: string;
  /** Absolute file path for editor tabs; null for terminal tabs. */
  path: string | null;
}

/** Whether a tab runs a shell rather than showing a file. */
export function isTerminalTab(session: TerminalSession): boolean {
  return session.path === null;
}

function labelFor(cwd: string | null): string {
  return cwd === null ? "Terminal" : folderName(cwd);
}

let counter = 0;

function createSession(cwd: string | null, shell: string | null): TerminalSession {
  counter += 1;
  return {
    id: `terminal-${Date.now()}-${counter}`,
    cwd,
    shell,
    // A profile tab is named after the shell it runs, a plain tab after the
    // project folder — so the two kinds are told apart at a glance, and the
    // label is fixed at the start.
    label: shell === null ? labelFor(cwd) : folderName(shell),
    path: null,
  };
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
 * @return The editor tab's id.
 */
export function openFileTab(path: string): string {
  const existing = sessions.find((session) => session.path === path);
  if (existing !== undefined) {
    setActiveTerminal(existing.id);
    return existing.id;
  }
  counter += 1;
  const session: TerminalSession = {
    id: `file-${Date.now()}-${counter}`,
    cwd: null,
    shell: null,
    label: folderName(path),
    path,
  };
  sessions = [...sessions, session];
  activeId = session.id;
  notify();
  return session.id;
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
