/**
 * @title Keymap
 * @notice Keyboard bindings for app actions — the settings screen records
 * them, the global listener in AppLayout applies them.
 * @dev Bindings live in a tiny external store so distant components can read
 * them without prop drilling; `useSyncExternalStore` keeps React in sync. They
 * persist in localStorage under `renonce.keymap`. An empty string means the
 * action is unbound.
 */
import { useSyncExternalStore } from "react";

export interface KeymapAction {
  /** Stable action id, e.g. "view.files". */
  id: string;
  /** Label shown in the settings list and the palette. */
  label: string;
  /** Binding applied when nothing is stored yet. */
  defaultBinding: string;
  /** Icon path under `public/assets/icons/` for the palette row. */
  iconSrc: string;
}

/** Actions that can be bound, in settings order. */
export const KEYMAP_ACTIONS: KeymapAction[] = [
  {
    id: "view.files",
    label: "Switch to Files",
    defaultBinding: "Ctrl+1",
    iconSrc: "/assets/icons/folder.svg",
  },
  {
    id: "view.agent",
    label: "Switch to Agent",
    defaultBinding: "Ctrl+2",
    iconSrc: "/assets/icons/agent.svg",
  },
  {
    id: "view.keys",
    label: "Show Key Bindings",
    defaultBinding: "Ctrl+K",
    iconSrc: "/assets/icons/keyboard.svg",
  },
  {
    id: "view.commands",
    label: "Show Commands",
    defaultBinding: "Ctrl+Shift+P",
    iconSrc: "/assets/icons/command.svg",
  },
  {
    id: "file.openFolder",
    label: "Open Folder",
    defaultBinding: "Ctrl+O",
    iconSrc: "/assets/icons/folder_open.svg",
  },
  {
    id: "file.newTerminal",
    label: "New Terminal",
    defaultBinding: "Ctrl+Shift+T",
    iconSrc: "/assets/icons/command.svg",
  },
  {
    id: "file.search",
    label: "Search Files",
    defaultBinding: "Ctrl+P",
    iconSrc: "/assets/icons/magnifying_glass.svg",
  },
  {
    id: "file.newWindow",
    label: "New Window",
    defaultBinding: "Ctrl+Shift+N",
    iconSrc: "/assets/icons/file_multiple.svg",
  },
  {
    id: "file.closeWindow",
    label: "Close Window",
    defaultBinding: "Ctrl+Shift+W",
    iconSrc: "/assets/icons/x_circle.svg",
  },
  {
    id: "file.closeFolder",
    label: "Close Folder",
    defaultBinding: "",
    iconSrc: "/assets/icons/folder.svg",
  },
];

/** Action id mapped to its binding. */
export type KeymapBindings = Record<string, string>;

const STORAGE_KEY = "renonce.keymap";

function defaultBindings(): KeymapBindings {
  const next: KeymapBindings = {};
  for (const action of KEYMAP_ACTIONS) {
    next[action.id] = action.defaultBinding;
  }
  return next;
}

function readStoredBindings(): KeymapBindings {
  const next = defaultBindings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return next;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return next;
    }
    for (const action of KEYMAP_ACTIONS) {
      const value = (parsed as Record<string, unknown>)[action.id];
      if (typeof value === "string") {
        next[action.id] = value;
      }
    }
  } catch {
    // Unreadable storage — keep the defaults.
  }
  return next;
}

let bindings: KeymapBindings = readStoredBindings();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(next: KeymapBindings): void {
  bindings = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Storage can be unavailable — the in-memory state still works.
  }
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Converts a keyboard event to the canonical binding string.
 * @dev Returns null while only modifiers are held, so a capture can wait for
 * the real key. Modifier order is fixed: Ctrl, Alt, Shift, Meta.
 * @param event Keydown event to describe.
 * @return Binding string like "Ctrl+Shift+A", or null for modifier-only presses.
 */
export function eventToBinding(event: KeyboardEvent): string | null {
  const { key } = event;
  if (key === "Control" || key === "Alt" || key === "Shift" || key === "Meta") {
    return null;
  }
  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  if (event.metaKey) {
    parts.push("Meta");
  }
  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return parts.join("+");
}

/**
 * @notice Finds the action bound to a pressed key combination.
 * @param event Keydown event to match.
 * @return The action id, or null when nothing matches.
 */
export function matchBinding(event: KeyboardEvent): string | null {
  const pressed = eventToBinding(event);
  if (pressed === null) {
    return null;
  }
  for (const action of KEYMAP_ACTIONS) {
    if (bindings[action.id] === pressed) {
      return action.id;
    }
  }
  return null;
}

/**
 * @notice Subscribes React to the current bindings.
 * @return The bindings map.
 */
export function useKeymap(): KeymapBindings {
  return useSyncExternalStore(subscribe, () => bindings);
}

/**
 * @notice Binds an action, or clears it when `binding` is an empty string.
 * @param actionId Action to update.
 * @param binding Binding string from {@link eventToBinding}.
 */
export function setBinding(actionId: string, binding: string): void {
  emit({ ...bindings, [actionId]: binding });
}

/**
 * @notice Restores every binding to its default.
 */
export function resetBindings(): void {
  emit(defaultBindings());
}
