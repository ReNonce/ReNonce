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
import { agentByKey } from "./agents";
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
  /** Terminal tab backing this run; empty once the CLI has exited. */
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
  // `exec` makes the CLI the terminal's process rather than a job inside a shell,
  // so quitting it ends the PTY — which is what tells us the run has stopped.
  const terminalId = openTerminal(cwd, null, `exec ${agent.command}`, true);
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
 * @notice Brings a run back on screen, or starts the agent again.
 * @dev Activating its terminal tab is what the center shows; moving the workspace
 * to the session's folder is what makes the run self-contained — the explorer,
 * terminals, and breadcrumb all follow it. A session whose CLI exited has no
 * terminal left, so the agent is launched again in the same folder. Resuming the
 * old conversation is deliberately not attempted: these CLIs scope sessions in
 * ways we cannot read reliably, and a guess would reopen the wrong one.
 * @param session Session to focus or launch again.
 */
export function focusAgentSession(session: AgentSession): void {
  if (session.terminalId !== "") {
    setActiveTerminal(session.terminalId);
    setWorkspaceRoot(session.cwd);
    return;
  }
  const agent = agentByKey(session.agentKey);
  if (agent === undefined) {
    return;
  }
  counter += 1;
  const terminalId = openTerminal(session.cwd, null, `exec ${agent.command}`, true);
  renameSession(terminalId, agent.label);
  sessions = sessions.map((candidate) =>
    candidate.id === session.id ? { ...candidate, terminalId } : candidate,
  );
  setWorkspaceRoot(session.cwd);
  notify();
}

/**
 * @notice Drops the session behind a terminal that has stopped.
 * @dev Called when a terminal's process exits. The tab is closed — a CLI that quit
 * should not leave a dead terminal behind — and the row goes with it, so the panel
 * only ever lists runs that are actually alive. Only sessions this layer owns are
 * touched, so a plain shell terminal keeps the behaviour it had.
 * @param terminalId Terminal whose process exited.
 * @return True when an agent session was removed.
 */
export function notifyAgentExit(terminalId: string): boolean {
  const session = sessions.find((candidate) => candidate.terminalId === terminalId);
  if (session === undefined) {
    // No row owns this terminal — it may already have been closed. The tab still
    // goes, because the caller only reports an exit for an agent-launched tab.
    closeTerminal(terminalId);
    notify();
    return false;
  }
  sessions = sessions.filter((candidate) => candidate.id !== session.id);
  closeTerminal(terminalId);
  notify();
  return true;
}

/**
 * @notice Ends a run: closes its terminal tab and drops the session.
 * @dev Closing both together is the point — the terminal is the run, so leaving
 * it behind would strand a tab that nothing navigates back to. A session that
 * already stopped has no terminal to close.
 * @param session Session to close.
 */
export function closeAgentSession(session: AgentSession): void {
  if (session.terminalId !== "") {
    closeTerminal(session.terminalId);
  }
  sessions = sessions.filter((candidate) => candidate.id !== session.id);
  notify();
}

/**
 * @notice Renames a run, so several of them in one folder stay tellable apart.
 * @param session Session to rename.
 * @param label New label; a blank one leaves the label as it was.
 */
export function renameAgentSession(session: AgentSession, label: string): void {
  const trimmed = label.trim();
  if (trimmed === "") {
    return;
  }
  sessions = sessions.map((candidate) =>
    candidate.id === session.id ? { ...candidate, label: trimmed } : candidate,
  );
  notify();
}

/**
 * @notice Ends every run.
 */
export function closeAllAgentSessions(): void {
  for (const session of sessions) {
    if (session.terminalId !== "") {
      closeTerminal(session.terminalId);
    }
  }
  sessions = [];
  notify();
}

/**
 * @notice Ends every run except one.
 * @param keep Session to leave running.
 */
export function closeOtherAgentSessions(keep: AgentSession): void {
  for (const session of sessions) {
    if (session.id !== keep.id && session.terminalId !== "") {
      closeTerminal(session.terminalId);
    }
  }
  sessions = sessions.filter((candidate) => candidate.id === keep.id);
  notify();
}
