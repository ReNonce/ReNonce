/**
 * @title Run saved command
 * @notice Runs a quick action in a terminal: the active session when there is
 * one, otherwise a session opened for it in the open folder.
 * @dev A quick action used to require a terminal already open — with none active
 * the command was dropped and the palette asked for one. It now opens the
 * session itself and hands the command over as that session's startup command,
 * the same path an agent launch takes, so the shell runs it as soon as the PTY
 * is listening and the new tab is what the panel shows.
 */
import { invoke } from "@tauri-apps/api/core";
import { getActiveTerminalId, openTerminal } from "../terminal/sessions";
import { getWorkspaceRoot } from "../workspace/workspace";

/**
 * @notice Runs a command in the active terminal, opening one when needed.
 * @param command Shell command to run.
 */
export function runSavedCommand(command: string): void {
  const id = getActiveTerminalId();
  if (id === "") {
    openTerminal(getWorkspaceRoot(), null, command);
    return;
  }
  void invoke("pty_write", { id, data: `${command}\n` }).catch(() => {
    // The session can be gone — the command is simply dropped.
  });
}
