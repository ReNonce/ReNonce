/**
 * @title Workspace
 * @notice The folder the app has open plus workspace preferences (auto save).
 * Shared by the menu bar, the file explorer, and — later — the terminal's
 * starting directory.
 * @dev External store, same pattern as the keymap and main view. The open folder
 * and the auto-save flag persist in localStorage under `renonce.workspace`.
 */
import { useSyncExternalStore } from "react";

export interface WorkspaceState {
  /** Absolute path of the open folder, or null when nothing is open. */
  root: string | null;
  /** Whether editors save automatically (used once editing lands). */
  autoSave: boolean;
  /** Previously opened folders, most recent first. */
  recentRoots: string[];
}

const STORAGE_KEY = "renonce.workspace";
const DEFAULT_STATE: WorkspaceState = { root: null, autoSave: true, recentRoots: [] };
/** Recent projects kept (and shown on the welcome screen). */
const MAX_RECENT_ROOTS = 5;

function readStoredState(): WorkspaceState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_STATE;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_STATE;
    }
    const { root, autoSave, recentRoots } = parsed as {
      root?: unknown;
      autoSave?: unknown;
      recentRoots?: unknown;
    };
    return {
      root: typeof root === "string" ? root : null,
      autoSave: typeof autoSave === "boolean" ? autoSave : DEFAULT_STATE.autoSave,
      recentRoots: Array.isArray(recentRoots)
        ? recentRoots.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_RECENT_ROOTS)
        : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

let state: WorkspaceState = readStoredState();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(next: WorkspaceState): void {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable — the in-memory state still works.
  }
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Reads the workspace state.
 * @return The current state.
 */
export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(subscribe, () => state);
}

/**
 * @notice Reads the open folder without a hook.
 * @return The absolute root path, or null when no folder is open.
 */
export function getWorkspaceRoot(): string | null {
  return state.root;
}

/**
 * @notice Subscribes to workspace changes without a hook.
 * @param listener Called after every change.
 * @return Unsubscribe function.
 */
export function subscribeWorkspace(listener: () => void): () => void {
  return subscribe(listener);
}

/**
 * @notice Opens a folder, or closes the current one by passing null.
 * @dev Opening a folder also bumps it to the front of the recent list.
 * @param root Absolute folder path.
 */
export function setWorkspaceRoot(root: string | null): void {
  const recentRoots =
    root === null
      ? state.recentRoots
      : [root, ...state.recentRoots.filter((entry) => entry !== root)].slice(0, MAX_RECENT_ROOTS);
  emit({ ...state, root, recentRoots });
}

/**
 * @notice Flips the auto-save preference.
 */
export function toggleAutoSave(): void {
  emit({ ...state, autoSave: !state.autoSave });
}
