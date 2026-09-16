/**
 * @title Shells
 * @notice Shells the terminal can launch, for the + menu.
 * @dev Provided by the backend (`list_shells`); empty outside the desktop shell,
 * where there is no PTY support either.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";

export interface ShellInfo {
  /** Display name (the program's file name). */
  name: string;
  /** Program to launch, e.g. "/bin/bash" or "pwsh.exe". */
  path: string;
}

/**
 * @notice Lists the shells available on this machine.
 * @return The shells, best first; empty outside the desktop shell.
 */
export async function listShells(): Promise<ShellInfo[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<ShellInfo[]>("list_shells");
}
