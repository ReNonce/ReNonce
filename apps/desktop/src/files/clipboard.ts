/**
 * @title File clipboard
 * @notice Cut/copy buffer for the explorer's context menu.
 * @dev Nothing is copied here — only the path and the mode are remembered, and
 * Paste resolves them against the target folder. The buffer clears after a
 * successful paste, and Cut entries are shown dimmed while they are pending.
 */
import { useSyncExternalStore } from "react";

export type ClipboardMode = "cut" | "copy";

export interface FileClipboard {
  /** Whether Paste should move or copy. */
  mode: ClipboardMode;
  /** Absolute path waiting to be pasted. */
  path: string;
}

let current: FileClipboard | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: FileClipboard | null): void {
  current = next;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Subscribes React to the pending cut/copy entry.
 * @return The clipboard contents, or null when empty.
 */
export function useFileClipboard(): FileClipboard | null {
  return useSyncExternalStore(subscribe, () => current);
}

/**
 * @notice Remembers an entry for a later Paste.
 * @param mode Cut (move on paste) or copy.
 * @param path Absolute path of the entry.
 */
export function setFileClipboard(mode: ClipboardMode, path: string): void {
  commit({ mode, path });
}

/**
 * @notice Empties the clipboard.
 */
export function clearFileClipboard(): void {
  commit(null);
}
