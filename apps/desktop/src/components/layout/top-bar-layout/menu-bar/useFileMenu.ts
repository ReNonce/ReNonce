/**
 * @title File menu
 * @notice Builds the "Files" menu of the top bar (folder, windows, save
 * placeholders, auto save) from the workspace store.
 * @dev Shortcuts shown on the right come from the keymap store, so rebinding an
 * action in Settings ▸ Keymap updates the menu. Actions that need the desktop
 * shell no-op in a plain browser (`npm run dev`). Save entries stay disabled
 * until an editor with dirty state exists.
 */
import { closeFolder, closeWindow, openFolder, openNewWindow } from "../../../../files/commands";
import { useKeymap } from "../../../../keymap/keymap";
import { toggleAutoSave, useWorkspace } from "../../../../workspace/workspace";
import type { MenuBarMenu } from "./MenuBar";

/**
 * @notice Assembles the Files menu for the current workspace state.
 * @return The menu definition.
 */
export function useFileMenu(): MenuBarMenu {
  const { root, autoSave } = useWorkspace();
  const bindings = useKeymap();

  return {
    id: "files",
    label: "Files",
    items: [
      { id: "new", label: "New", disabled: true },
      {
        id: "new-window",
        label: "New Window",
        shortcut: bindings["file.newWindow"],
        onSelect: openNewWindow,
      },
      {
        id: "open-folder",
        label: "Open Folder…",
        shortcut: bindings["file.openFolder"],
        onSelect: () => void openFolder(),
      },
      {
        id: "close-folder",
        label: "Close Folder",
        shortcut: bindings["file.closeFolder"],
        disabled: root === null,
        onSelect: closeFolder,
      },
      { id: "save", label: "Save", disabled: true, separatorBefore: true },
      { id: "save-as", label: "Save As…", disabled: true },
      { id: "auto-save", label: "Auto Save", checked: autoSave, onSelect: toggleAutoSave },
      {
        id: "close-window",
        label: "Close Window",
        shortcut: bindings["file.closeWindow"],
        separatorBefore: true,
        onSelect: closeWindow,
      },
    ],
  };
}
