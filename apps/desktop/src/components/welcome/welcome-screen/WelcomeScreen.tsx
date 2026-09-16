/**
 * @title Welcome screen
 * @notice Shown until a folder is open: brand block, a "Get started" list with
 * the Open Folder and Key bindings rows, and a "Recent project" list of the
 * folders opened most recently. The terminal panel reuses it as its empty state,
 * so both places offer the same next steps.
 * @dev Rows read their bindings from the keymap store, so rebinding updates the
 * hints. The brand mark is the transparent variant, so it disappears on light
 * backgrounds (the Logo component warns in dev).
 * @return The welcome element.
 */
import { openFolder } from "../../../files/commands";
import { folderName } from "../../../files/path";
import { useKeymap } from "../../../keymap/keymap";
import { openPalette } from "../../../palette/palette";
import { setWorkspaceRoot, useWorkspace } from "../../../workspace/workspace";
import { Logo } from "../../brand/logo/Logo";
import { CommandRow } from "../../command/command-row/CommandRow";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import "./WelcomeScreen.css";

export function WelcomeScreen() {
  const bindings = useKeymap();
  const { recentRoots } = useWorkspace();

  return (
    <div className="welcome">
      <div className="welcome__brand-block">
        <Logo variant="icon-only" size={56} alt="" />
        <p className="welcome__brand">ReNonce</p>
        <p className="welcome__description">AI audit platform.</p>
      </div>

      <div className="welcome__card">
        <h2 className="welcome__heading">
          Get started
          <span className="welcome__divider" aria-hidden="true" />
        </h2>
        <CommandRow
          icon={<MaskIcon src="/assets/icons/folder_open.svg" />}
          label="Open Folder"
          hint={bindings["file.openFolder"]}
          onSelect={() => void openFolder()}
        />
        <CommandRow
          icon={<MaskIcon src="/assets/icons/keyboard.svg" />}
          label="Key bindings"
          hint={bindings["view.keys"]}
          onSelect={() => openPalette("bindings")}
        />
        <CommandRow
          icon={<MaskIcon src="/assets/icons/command.svg" />}
          label="Commands"
          hint={bindings["view.commands"]}
          onSelect={() => openPalette("commands")}
        />
      </div>

      {recentRoots.length > 0 && (
        <div className="welcome__card">
          <h2 className="welcome__heading">
            Recent project
            <span className="welcome__divider" aria-hidden="true" />
          </h2>
          {recentRoots.map((path) => (
            <CommandRow
              key={path}
              icon={<MaskIcon src="/assets/icons/folder.svg" />}
              label={folderName(path)}
              hint={path}
              onSelect={() => setWorkspaceRoot(path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
