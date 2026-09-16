/**
 * @title File commands
 * @notice Workspace actions shared by the Files menu and the keymap listener:
 * pick a folder, open a window, close a window, close the folder.
 * @dev Plain functions rather than hooks, so both callers can use them. Each
 * one no-ops outside the desktop shell, where the dialog and window APIs are
 * unavailable.
 */
import { isTauri } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { setWorkspaceRoot } from "../workspace/workspace";

/**
 * @notice Opens the folder picker and adopts the chosen folder.
 * @return Resolves once the dialog has been handled.
 */
export async function openFolder(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  const selected = await open({ directory: true, multiple: false });
  if (typeof selected === "string") {
    setWorkspaceRoot(selected);
  }
}

/**
 * @notice Opens a second ReNonce window on the same app instance.
 */
export function openNewWindow(): void {
  if (!isTauri()) {
    return;
  }
  try {
    void new WebviewWindow(`window-${Date.now()}`, {
      url: "/",
      title: "ReNonce",
      width: 1100,
      height: 720,
      decorations: false,
    });
  } catch (cause) {
    console.warn("[ReNonce] could not open a new window", cause);
  }
}

/**
 * @notice Closes the current window.
 */
export function closeWindow(): void {
  if (!isTauri()) {
    return;
  }
  void getCurrentWindow().close();
}

/**
 * @notice Closes the open folder.
 */
export function closeFolder(): void {
  setWorkspaceRoot(null);
}
