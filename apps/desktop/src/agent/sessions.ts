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
import { agentByKey, resumeArgsFor, resumeWithIdFor, sessionIdFlagFor } from "./agents";
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
  /** Exact command the CLI printed to come back to this conversation. */
  resumeCommand: string | null;
  /** Id pinned for this conversation, when the CLI let us choose one. */
  sessionId: string | null;
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
  // so quitting it ends the PTY — which is what tells us the run has stopped. The
  // id is pinned when the CLI takes one, so this row can come back to this exact
  // conversation even with several of them open in the same folder.
  const flag = sessionIdFlagFor(agent.key);
  const sessionId = flag === null ? null : crypto.randomUUID();
  const launch =
    flag === null || sessionId === null
      ? `exec ${agent.command}`
      : `exec ${agent.command} ${flag} ${sessionId}`;
  const terminalId = openTerminal(cwd, null, launch, true);
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
    resumeCommand: null,
    sessionId,
  };
  sessions = [...sessions, session];
  notify();
  return session;
}

/**
 * @notice Brings a run back on screen, resuming its CLI when it has stopped.
 * @dev Activating its terminal tab is what the center shows; moving the workspace
 * to the session's folder is what makes the run self-contained — the explorer,
 * terminals, and breadcrumb all follow it. A session whose CLI exited has no
 * terminal left, so one is opened in the same folder and the CLI is asked to
 * continue its most recent conversation there.
 * @param session Session to focus or resume.
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
  // A pinned id is the point of the row: reopening that conversation, not the
  // folder's most recent one. Only when there is none does it fall back to the
  // command the CLI printed, and last to the CLI's own "latest" flag.
  const openWith = resumeWithIdFor(agent.key);
  const pinned =
    session.sessionId !== null && openWith !== null
      ? `${agent.command} ${openWith} ${session.sessionId}`
      : null;
  const resume =
    pinned ??
    session.resumeCommand ??
    (() => {
      const args = resumeArgsFor(agent.key);
      return args === null ? agent.command : `${agent.command} ${args}`;
    })();
  const terminalId = openTerminal(session.cwd, null, `exec ${resume}`, true);
  renameSession(terminalId, agent.label);
  sessions = sessions.map((candidate) =>
    candidate.id === session.id ? { ...candidate, terminalId } : candidate,
  );
  setWorkspaceRoot(session.cwd);
  notify();
}

/** Escape sequences a CLI wraps its output in; stripped before a hint is read. */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/** The line agents print on quit naming the conversation to come back to. */
const RESUME_HINT =
  /\b([a-z][\w-]*)\s+(?:--resume|resume|--session|session)\s+([0-9A-Za-z][0-9A-Za-z-]{7,})/;

/** How much of a terminal's output is kept around to find that hint. */
const TAIL_LIMIT = 8_000;

/** Recent output per running terminal, dropped when the process ends. */
const outputTails = new Map<string, string>();

/**
 * @notice Keeps the tail of a running agent terminal's output.
 * @dev Only terminals an agent session owns are tracked, and only while they run:
 * this exists to catch the resume hint a CLI prints on quit, and is dropped as
 * soon as the session stops.
 * @param terminalId Terminal the chunk came from.
 * @param chunk Raw output, escape sequences included.
 */
export function captureAgentOutput(terminalId: string, chunk: string): void {
  if (!sessions.some((candidate) => candidate.terminalId === terminalId)) {
    return;
  }
  const tail = (outputTails.get(terminalId) ?? "") + chunk.replace(ANSI_PATTERN, "");
  outputTails.set(terminalId, tail.length > TAIL_LIMIT ? tail.slice(-TAIL_LIMIT) : tail);
}

/**
 * @notice Reads the resume command a CLI printed before it quit.
 * @dev Agents name the exact conversation to come back to on their last line —
 * `grok --resume 01a0…`, `codex resume 5b1c…`, `opencode --session 7f2a…` — and
 * that id is worth keeping: the folder's most recent conversation is not always
 * the one that was open. The last matching line wins, and a line that names some
 * other program is ignored, so only our own launcher can come back out.
 * @param terminalId Terminal that exited.
 * @param agentKey Catalog key of the agent that ran.
 * @return The command to run again, or null when nothing was printed.
 */
function takeResumeCommand(terminalId: string, agentKey: string): string | null {
  const tail = outputTails.get(terminalId) ?? "";
  outputTails.delete(terminalId);
  const agent = agentByKey(agentKey);
  if (agent === undefined) {
    return null;
  }
  // Only a line that names the CLI we launched counts: prose such as "the session
  // 8f3c…" would otherwise be read as a launch command.
  const pattern = new RegExp(RESUME_HINT.source, "g");
  let found: string | null = null;
  for (let match = pattern.exec(tail); match !== null; match = pattern.exec(tail)) {
    if (match[1] === agent.command) {
      found = `${agent.command}${match[0].slice(match[1].length)}`;
    }
  }
  return found;
}

/**
 * @notice Marks the session behind a terminal as no longer running.
 * @dev Called when a terminal's process exits. The tab is closed — a CLI that
 * quit should not leave a dead terminal behind — while the row stays, so the
 * conversation can be resumed from the panel, ideally by the exact command the
 * CLI printed on its way out. Only sessions this layer owns are touched, so a
 * plain shell terminal keeps the behaviour it had.
 * @param terminalId Terminal whose process exited.
 * @return True when an agent session was marked dormant.
 */
export function notifyAgentExit(terminalId: string): boolean {
  const session = sessions.find((candidate) => candidate.terminalId === terminalId);
  const captured = session === undefined ? null : takeResumeCommand(terminalId, session.agentKey);
  if (session === undefined) {
    outputTails.delete(terminalId);
  } else {
    sessions = sessions.map((candidate) =>
      candidate.id === session.id
        ? { ...candidate, terminalId: "", resumeCommand: captured ?? candidate.resumeCommand }
        : candidate,
    );
  }
  // Closing is unconditional: the caller only reports an exit for a tab it knows
  // was launched as an agent, so the tab always goes even if no row claims it.
  closeTerminal(terminalId);
  notify();
  return session !== undefined;
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
