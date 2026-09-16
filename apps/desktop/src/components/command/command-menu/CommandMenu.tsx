/**
 * @title Command menu
 * @notice "Command" button in the terminal panel header; opens the command
 * palette (same thing as Ctrl+Shift+P).
 * @dev The palette itself is shared (`CommandPalette`), so this stays a thin
 * trigger.
 */
import { Lightning } from "@phosphor-icons/react";
import { openPalette, usePalette } from "../../../palette/palette";
import "./CommandMenu.css";

export function CommandMenu() {
  const open = usePalette() === "commands";

  return (
    <button
      type="button"
      className="command-menu__button"
      aria-haspopup="dialog"
      aria-expanded={open}
      title="Quick actions"
      onClick={() => {
        openPalette(open ? null : "commands");
      }}
    >
      <Lightning size={16} />
      Command
    </button>
  );
}
