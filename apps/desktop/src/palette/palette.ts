/**
 * @title Palette
 * @notice Which palette overlay is open, if any: the key binding list or the
 * command picker.
 * @dev Tiny external store so keymap actions, the welcome card, and the terminal
 * header button can all drive it without prop drilling.
 */
import { useSyncExternalStore } from "react";

export type PaletteKind = "bindings" | "commands";

let current: PaletteKind | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * @notice Subscribes React to the open palette.
 * @return The open palette kind, or null when closed.
 */
export function usePalette(): PaletteKind | null {
  return useSyncExternalStore(subscribe, () => current);
}

/**
 * @notice Opens a palette, or closes the open one when passed null.
 * @param kind Palette to show.
 */
export function openPalette(kind: PaletteKind | null): void {
  if (kind === current) {
    return;
  }
  current = kind;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Closes whatever palette is open.
 */
export function closePalette(): void {
  openPalette(null);
}
