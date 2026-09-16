/**
 * @title Center layout
 * @notice Center content panel: its own top bar with the terminal tab strip,
 * plus the stacked terminal surfaces; fills the space between the side panels.
 * @dev `flex: 1 1 0` with `min-width: 0` lets the resizers shrink it down to the
 * minimum enforced in ContentLayout. New sessions start in the open folder.
 * @return The center panel element.
 */
import {
  closeAllTerminals,
  closeOtherTerminals,
  closeTerminal,
  openTerminal,
  setActiveTerminal,
  useActiveTabId,
  useTerminalSessions,
} from "../../../../terminal/sessions";
import { useWorkspace } from "../../../../workspace/workspace";
import { CommandMenu } from "../../../command/command-menu/CommandMenu";
import { TerminalTabs } from "../../../terminal/terminal-tabs/TerminalTabs";
import { TerminalView } from "../../../terminal/terminal-view/TerminalView";
import { PanelHeader } from "../../panel-header/PanelHeader";
import "./CenterLayout.css";

export function CenterLayout() {
  const { root } = useWorkspace();
  const sessions = useTerminalSessions();
  const activeId = useActiveTabId();

  return (
    <section className="center-layout">
      <PanelHeader>
        <TerminalTabs
          tabs={sessions.map((session) => ({ id: session.id, label: session.label }))}
          activeId={activeId}
          onSelect={setActiveTerminal}
          onClose={closeTerminal}
          onOpen={(shell) => openTerminal(root, shell)}
          onCloseOthers={closeOtherTerminals}
          onCloseAll={closeAllTerminals}
        />
        <CommandMenu />
      </PanelHeader>
      <div className="center-layout__content">
        <TerminalView />
      </div>
    </section>
  );
}
