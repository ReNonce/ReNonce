/**
 * @title Run saved command
 * @notice Types a quick action's command into the active terminal session.
 * @dev Returns false when no session is open, so callers can explain instead of
 * silently dropping the command. The newline makes the shell execute it.
 */
import { invoke } from "@tauri-apps/api/core";
import { getActiveTerminalId } from "../terminal/sessions";

/**
 * @notice Runs a command in the active terminal.
 * @param command Shell command to type.
 * @return True when it was sent to a session.
 */
export function runSavedCommand(command: string): boolean {
  const id = getActiveTerminalId();
  if (id === "") {
    return false;
  }
  void invoke("pty_write", { id, data: `${command}\n` }).catch(() => {
    // The session can be gone — the command is simply dropped.
  });
  return true;
}
