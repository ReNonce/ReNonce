/**
 * @title Main view
 * @notice Which top-level tab the workspace shows (Files / Agent), shared by the
 * panel switcher, the keymap listener, and the views themselves.
 * @dev Tiny external store — same idea as the keymap — so distant components can
 * read the value without prop drilling.
 */
import { useSyncExternalStore } from "react";

/** Top-level workspace views. */
export type MainView = "files" | "agent";

export interface MainViewItem {
  /** View key. */
  key: MainView;
  /** Segment label. */
  label: string;
  /** Icon path under `public/assets/icons/`. */
  iconSrc: string;
}

/** Views shown in the panel switcher, in order. */
export const MAIN_VIEW_ITEMS: MainViewItem[] = [
  { key: "files", label: "Files", iconSrc: "/assets/icons/folder.svg" },
  { key: "agent", label: "Agent", iconSrc: "/assets/icons/agent.svg" },
];

let mainView: MainView = "files";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * @notice Reads the active main view.
 * @return The active view key.
 */
export function useMainView(): MainView {
  return useSyncExternalStore(subscribe, () => mainView);
}

/**
 * @notice Switches the main view.
 * @param next View key to activate.
 */
export function setMainView(next: MainView): void {
  mainView = next;
  for (const listener of listeners) {
    listener();
  }
}
