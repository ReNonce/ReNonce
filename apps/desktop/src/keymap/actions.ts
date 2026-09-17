/**
 * @title Keymap actions
 * @notice Maps keymap action ids to the thing they do.
 * @dev The keymap store only knows ids and bindings; this module is the single
 * place where an id becomes behaviour, shared by the global listener in
 * AppLayout. Actions without a handler are simply ignored.
 */
import { closeFolder, closeWindow, openFolder, openNewWindow } from "../files/commands";
import { openPalette } from "../palette/palette";
import { openTerminal } from "../terminal/sessions";
import { setMainView } from "../view/main-view";
import { getWorkspaceRoot } from "../workspace/workspace";

const HANDLERS: Record<string, () => void> = {
  "view.files": () => setMainView("files"),
  "view.agent": () => setMainView("agent"),
  "view.keys": () => openPalette("bindings"),
  "view.commands": () => openPalette("commands"),
  "file.openFolder": () => void openFolder(),
  "file.newTerminal": () => {
    const root = getWorkspaceRoot();
    if (root !== null) {
      openTerminal(root, null);
    }
  },
  "file.search": () => {
    // Every panel search uses the shared field, so focus whatever is on screen;
    // the Files panel may mount on this tick, hence the next-frame focus.
    const focusField = () => {
      const input = document.querySelector<HTMLInputElement>(".search-field__input");
      input?.focus();
      input?.select();
    };
    if (document.querySelector(".search-field__input") !== null) {
      focusField();
      return;
    }
    setMainView("files");
    window.requestAnimationFrame(focusField);
  },
  "file.newWindow": openNewWindow,
  "file.closeFolder": closeFolder,
  "file.closeWindow": closeWindow,
};

/**
 * @notice Runs the handler bound to an action id.
 * @param actionId Action id from `matchBinding`.
 * @return True when a handler ran.
 */
export function runKeymapAction(actionId: string): boolean {
  const handler = HANDLERS[actionId];
  if (handler === undefined) {
    return false;
  }
  handler();
  return true;
}
