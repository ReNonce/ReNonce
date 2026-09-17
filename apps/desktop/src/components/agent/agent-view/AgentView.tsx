/**
 * @title Agent view
 * @notice Left panel's Agent view: the shared search row, a "New session"
 * button, and the section heading over the list of agent runs.
 * @dev Starting a session opens a terminal tab that launches the chosen agent
 * CLI in the open folder, so the center shows the agent working while this list
 * keeps every run reachable. Selecting a row brings that run back: it activates
 * its terminal and moves the workspace to the session's folder, which is what
 * makes each run self-contained. Rows whose terminal was closed fall away.
 */
import { useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { AGENT_CLIS } from "../../../agent/agents";
import type { AgentCli } from "../../../agent/agents";
import {
  closeAgentSession,
  focusAgentSession,
  openAgentSession,
  useAgentSessions,
} from "../../../agent/sessions";
import { folderName } from "../../../files/path";
import { useActiveTabId, useTerminalSessions } from "../../../terminal/sessions";
import { useWorkspace } from "../../../workspace/workspace";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { CommandRow } from "../../command/command-row/CommandRow";
import { PaletteShell } from "../../palette/palette-shell/PaletteShell";
import { SearchField } from "../../ui/search-field/SearchField";
import { SectionHeading } from "../../ui/section-heading/SectionHeading";
import { AgentUsageBar } from "../agent-usage-bar/AgentUsageBar";
import "./AgentView.css";

export function AgentView() {
  const { root } = useWorkspace();
  const sessions = useAgentSessions();
  const terminals = useTerminalSessions();
  const activeTabId = useActiveTabId();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // A closed terminal takes its agent session with it.
  const live = sessions.filter((session) =>
    terminals.some((terminal) => terminal.id === session.terminalId),
  );
  const needle = query.trim().toLowerCase();
  const visible =
    needle === ""
      ? live
      : live.filter((session) => session.label.toLowerCase().includes(needle));

  const agentNeedle = pickerQuery.trim().toLowerCase();
  const matches = AGENT_CLIS.filter(
    (agent) =>
      agentNeedle === "" ||
      agent.label.toLowerCase().includes(agentNeedle) ||
      agent.key.includes(agentNeedle) ||
      agent.command.includes(agentNeedle),
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [pickerQuery]);

  const start = (agent: AgentCli) => {
    openAgentSession(agent, root);
    setPickerOpen(false);
    setPickerQuery("");
  };

  const onPickerKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      const agent = matches[activeIndex];
      if (agent !== undefined) {
        start(agent);
      }
    }
  };

  return (
    <div className="agent-view">
      <div className="agent-view__top">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search agents"
          binding="file.search"
        />

        <div className="agent-view__actions">
          <button
            type="button"
            className="agent-view__new"
            disabled={root === null}
            title={
              root === null ? "Open a folder to start a session" : "Start a new agent session"
            }
            onClick={() => setPickerOpen(true)}
          >
            <MaskIcon src="/assets/icons/square_plus.svg" size={14} />
            New session
          </button>
        </div>

        <div className="agent-view__heading-row">
          <SectionHeading label="Agent" />
        </div>
      </div>

      <div className="agent-view__list">
        {visible.length === 0 && (
          <p className="agent-view__placeholder">
            {live.length === 0
              ? "No session yet — start one with New session."
              : `No session matches "${query}".`}
          </p>
        )}
        {visible.map((session) => (
          <CommandRow
            key={session.id}
            icon={<MaskIcon src={session.iconSrc} />}
            label={session.label}
            hint={session.cwd === null ? undefined : folderName(session.cwd)}
            active={session.terminalId === activeTabId}
            onSelect={() => focusAgentSession(session)}
            onRemove={() => closeAgentSession(session)}
            removeLabel={`Close ${session.label} session`}
          />
        ))}
      </div>

      {pickerOpen && (
        <PaletteShell
          label="New agent session"
          placeholder="Search agents"
          query={pickerQuery}
          onQueryChange={setPickerQuery}
          onSearchKeyDown={onPickerKeyDown}
          onClose={() => {
            setPickerOpen(false);
            setPickerQuery("");
          }}
        >
          <section className="palette-shell__section">
            <h2 className="palette-shell__heading">
              Agents
              <span className="palette-shell__divider" aria-hidden="true" />
            </h2>
            {matches.map((agent, index) => (
              <CommandRow
                key={agent.key}
                icon={<MaskIcon src={agent.iconSrc} />}
                label={agent.label}
                hint={agent.command}
                active={index === activeIndex}
                onSelect={() => start(agent)}
              />
            ))}
            {matches.length === 0 && (
              <p className="agent-view__placeholder">No agent matches.</p>
            )}
          </section>
        </PaletteShell>
      )}

      <AgentUsageBar />
    </div>
  );
}
