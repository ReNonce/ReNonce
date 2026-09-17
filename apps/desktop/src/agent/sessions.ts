/**
 * @title Agent sessions
 * @notice Agent runs of the left panel: each one is a terminal tab that starts by
 * launching an agent CLI in the session's folder.
 * @dev The store owns only the agent-facing view of a session; the terminal tab
 * itself stays in `terminal/sessions`, which is what the center renders. Rows
 * for terminals that have been closed are pruned by the panel, so closing a tab
 * simply drops its agent session.
 */
import { useSyncExternalStore } from "react";
import {
  closeTerminal,
  openTerminal,
  renameSession,
  setActiveTerminal,
} from "../terminal/sessions";
import { setWorkspaceRoot } from "../workspace/workspace";
import type { AgentCli } from "./agents";

export interface AgentSession {
  /** Stable session id (its own, not the terminal tab's). */
  id: string;
  /** Catalog key of the agent. */
  agentKey: string;
  /** Label shown on the row, usually the agent name. */
  label: string;
  /** Icon of the agent. */
  iconSrc: string;
  /** Folder the run happens in; also what the workspace switches to. */
  cwd: string | null;
  /** Terminal tab backing this run. */
  terminalId: string;
}

let sessions: AgentSession[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Subscribes React to the agent session list.
 * @return Sessions in the order they were started.
 */
export function useAgentSessions(): AgentSession[] {
  return useSyncExternalStore(subscribe, () => sessions);
}

/** Reads the list without subscribing, for plain modules. */
export function getAgentSessions(): AgentSession[] {
  return sessions;
}

/**
 * @notice Starts an agent run: opens a terminal in `cwd` and launches the CLI.
 * @dev The launcher is handed to the terminal as its startup command, so it is
 * typed once the PTY is actually listening rather than racing it.
 * @param agent Catalog entry to launch.
 * @param cwd Folder for the run; null uses the process default.
 * @return The new agent session.
 */
export function openAgentSession(agent: AgentCli, cwd: string | null): AgentSession {
  counter += 1;
  const terminalId = openTerminal(cwd, null, agent.command);
  // The tab is named after the agent, so the strip reads "Codex CLI" rather
  // than the folder the session happens to run in.
  renameSession(terminalId, agent.label);
  const session: AgentSession = {
    id: `agent-${Date.now()}-${counter}`,
    agentKey: agent.key,
    label: agent.label,
    iconSrc: agent.iconSrc,
    cwd,
    terminalId,
  };
  sessions = [...sessions, session];
  notify();
  return session;
}

/**
 * @notice Brings a run back on screen.
 * @dev Activating its terminal tab is what the center shows; moving the
 * workspace to the session's folder is what makes the run self-contained —
 * the explorer, terminals, and breadcrumb all follow it.
 * @param session Session to focus.
 */
export function focusAgentSession(session: AgentSession): void {
  setActiveTerminal(session.terminalId);
  setWorkspaceRoot(session.cwd);
}

/**
 * @notice Ends a run: closes its terminal tab and drops the session.
 * @dev Closing both together is the point — the terminal is the session, so
 * leaving it behind would strand a tab that nothing navigates back to.
 * @param session Session to close.
 */
export function closeAgentSession(session: AgentSession): void {
  closeTerminal(session.terminalId);
  sessions = sessions.filter((candidate) => candidate.id !== session.id);
  notify();
}
