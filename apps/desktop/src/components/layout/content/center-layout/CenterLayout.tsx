/**
 * @title Center layout
 * @notice Center content panel: its own top bar with the terminal tab strip,
 * plus the stacked terminal surfaces; fills the space between the side panels.
 * @dev `flex: 1 1 0` with `min-width: 0` lets the resizers shrink it down to the
 * minimum enforced in ContentLayout. New sessions start in the open folder.
 * Agent runs are left out of the strip on purpose: they are navigated from the
 * Agent panel, so the tabs here stay about files and views.
 * @return The center panel element.
 */
import { useAgentSessions } from "../../../../agent/sessions";
import {
  closeAllTerminals,
  closeOtherTerminals,
  closeTerminal,
  openTerminal,
  renameSession,
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
  const agentSessions = useAgentSessions();

  // Agent tabs live in the Agent panel, not in this strip.
  const agentTerminalIds = new Set(agentSessions.map((session) => session.terminalId));
  const tabs = sessions.filter((session) => !agentTerminalIds.has(session.id));

  return (
    <section className="center-layout">
      <PanelHeader>
        <TerminalTabs
          tabs={tabs.map((session) => ({ id: session.id, label: session.label }))}
          activeId={activeId}
          onSelect={setActiveTerminal}
          onClose={closeTerminal}
          onOpen={(shell) => openTerminal(root, shell)}
          onRename={renameSession}
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
