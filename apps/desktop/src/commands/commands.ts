/**
 * @title Saved commands
 * @notice Quick actions for the terminal: a label plus a shell command, scoped
 * to the current project or to the whole app.
 * @dev External store like the others. Everything persists in localStorage under
 * `renonce.commands` as `{ global: [...], projects: { [root]: [...] } }`, so a
 * project-scoped command travels with the folder it was created in.
 */
import { useSyncExternalStore } from "react";
import { getWorkspaceRoot } from "../workspace/workspace";

export type CommandScope = "project" | "global";

export interface SavedCommand {
  /** Stable id, used for removal. */
  id: string;
  /** Row label. */
  label: string;
  /** Shell command to run in the active terminal. */
  command: string;
  /** Where the command is stored. */
  scope: CommandScope;
}

interface StoredCommands {
  global: SavedCommand[];
  projects: Record<string, SavedCommand[]>;
}

const STORAGE_KEY = "renonce.commands";
const EMPTY: SavedCommand[] = [];

function normalizeCommand(value: unknown): SavedCommand | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { id, label, command, scope } = value as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    typeof label !== "string" ||
    typeof command !== "string" ||
    (scope !== "project" && scope !== "global")
  ) {
    return null;
  }
  return { id, label, command, scope };
}

function readStored(): StoredCommands {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { global: [], projects: {} };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { global: [], projects: {} };
    }
    const { global, projects } = parsed as { global?: unknown; projects?: unknown };
    const next: StoredCommands = {
      global: Array.isArray(global) ? global.map(normalizeCommand).filter(isCommand) : [],
      projects: {},
    };
    if (typeof projects === "object" && projects !== null) {
      for (const [root, entries] of Object.entries(projects as Record<string, unknown>)) {
        if (Array.isArray(entries)) {
          next.projects[root] = entries.map(normalizeCommand).filter(isCommand);
        }
      }
    }
    return next;
  } catch {
    return { global: [], projects: {} };
  }
}

let stored: StoredCommands = readStored();
const listeners = new Set<() => void>();

function isCommand(value: SavedCommand | null): value is SavedCommand {
  return value !== null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: StoredCommands): void {
  stored = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage can be unavailable — the in-memory state still works.
  }
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Subscribes React to the app-wide commands.
 * @return Commands stored with global scope.
 */
export function useGlobalCommands(): SavedCommand[] {
  return useSyncExternalStore(subscribe, () => stored.global);
}

/**
 * @notice Subscribes React to the open folder's commands.
 * @return Commands stored with project scope for the current root.
 */
export function useProjectCommands(): SavedCommand[] {
  const root = getWorkspaceRoot() ?? "";
  return useSyncExternalStore(subscribe, () => stored.projects[root] ?? EMPTY);
}

/**
 * @notice Adds a command.
 * @param label Row label.
 * @param command Shell command to run.
 * @param scope Storage scope; project needs an open folder.
 */
export function addCommand(label: string, command: string, scope: CommandScope): void {
  const entry: SavedCommand = {
    id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    command,
    scope,
  };
  if (scope === "global") {
    commit({ ...stored, global: [...stored.global, entry] });
    return;
  }
  const root = getWorkspaceRoot();
  if (root === null) {
    return;
  }
  const existing = stored.projects[root] ?? [];
  commit({ ...stored, projects: { ...stored.projects, [root]: [...existing, entry] } });
}

/**
 * @notice Removes a command from whichever scope holds it.
 * @param id Command id.
 */
export function removeCommand(id: string): void {
  const projects: Record<string, SavedCommand[]> = {};
  for (const [root, entries] of Object.entries(stored.projects)) {
    projects[root] = entries.filter((entry) => entry.id !== id);
  }
  commit({
    global: stored.global.filter((entry) => entry.id !== id),
    projects,
  });
}
