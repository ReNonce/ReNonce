/**
 * @title Agent catalog
 * @notice The agent CLIs a session can launch: label, icon from the local
 * collection, and the command typed into a fresh terminal.
 * @dev Commands are plain launcher names the shell resolves from PATH, and the
 * backend reports which of them are actually installed, so the picker only offers
 * what the machine can run.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";

export interface AgentCli {
  /** Stable key, also used for icon lookups in the panel. */
  key: string;
  /** Name shown in the picker and on session rows. */
  label: string;
  /** Icon under `/assets/icons`. */
  iconSrc: string;
  /** Launcher command typed into the new terminal. */
  command: string;
  /** One-line description for the picker. */
  description: string;
}

export const AGENT_CLIS: AgentCli[] = [
  {
    key: "claude",
    label: "Claude Code",
    iconSrc: "/assets/icons/ai_claude.svg",
    command: "claude",
    description: "Anthropic's coding agent",
  },
  {
    key: "codex",
    label: "Codex CLI",
    iconSrc: "/assets/icons/ai_open_ai.svg",
    command: "codex",
    description: "OpenAI's coding agent",
  },
  {
    key: "gemini",
    label: "Gemini CLI",
    iconSrc: "/assets/icons/ai_gemini.svg",
    command: "gemini",
    description: "Google's coding agent",
  },
  {
    key: "grok",
    label: "Grok CLI",
    iconSrc: "/assets/icons/ai_x_ai.svg",
    command: "grok",
    description: "xAI's coding agent",
  },
  {
    key: "opencode",
    label: "opencode",
    iconSrc: "/assets/icons/ai_open_code.svg",
    command: "opencode",
    description: "Open-source coding agent",
  },
  {
    key: "copilot",
    label: "Copilot CLI",
    iconSrc: "/assets/icons/copilot.svg",
    command: "copilot",
    description: "GitHub's coding agent",
  },
  {
    key: "kimi",
    label: "Kimi Code",
    iconSrc: "/assets/icons/ai_model.svg",
    command: "kimi",
    description: "Moonshot's coding agent",
  },
  {
    key: "minimax",
    label: "MiniMax",
    iconSrc: "/assets/icons/ai_model.svg",
    command: "minimax",
    description: "MiniMax's coding agent",
  },
  {
    key: "antigravity",
    label: "Antigravity",
    iconSrc: "/assets/icons/ai_google.svg",
    command: "antigravity",
    description: "Google's agentic IDE",
  },
];

/**
 * Arguments that make a CLI pick up its most recent session in the working
 * folder — how these CLIs scope a conversation to a project.
 * @dev Verified against each CLI's own `--help`. A key that is absent means the
 * CLI has no such flag, and resuming then starts the agent fresh instead of
 * guessing at an argument that would not be understood.
 */
const RESUME_ARGS: Record<string, string> = {
  claude: "--continue",
  codex: "resume --last",
  copilot: "--continue",
  gemini: "--resume",
  grok: "--resume",
  kimi: "--continue",
  opencode: "--continue",
};

/**
 * Flag that pins a brand-new conversation to an id we choose.
 * @dev Only these CLIs accept one at launch (`--session-id <uuid>`), and pinning
 * it is what makes a row come back to its own conversation instead of whichever
 * one happens to be the folder's most recent.
 */
const SESSION_ID_FLAG: Record<string, string> = {
  claude: "--session-id",
  copilot: "--session-id",
  gemini: "--session-id",
  grok: "--session-id",
};

/** How a CLI is asked to open one exact conversation. */
const RESUME_WITH_ID: Record<string, string> = {
  claude: "--resume",
  codex: "resume",
  copilot: "--resume",
  gemini: "--resume",
  grok: "--resume",
  kimi: "--session",
  opencode: "--session",
};

/**
 * @notice Flag that accepts a session id at launch.
 * @param key Catalog key of the agent.
 * @return The flag, or null when the CLI cannot be pinned.
 */
export function sessionIdFlagFor(key: string): string | null {
  return SESSION_ID_FLAG[key] ?? null;
}

/**
 * @notice How a CLI reopens an exact conversation.
 * @param key Catalog key of the agent.
 * @return The command part to put before the id, or null when it cannot.
 */
export function resumeWithIdFor(key: string): string | null {
  return RESUME_WITH_ID[key] ?? null;
}

/**
 * @notice Arguments that resume an agent's last session.
 * @dev The fallback for CLIs whose id we could not learn: it picks the folder's
 * most recent conversation, which is why pinning an id is preferred.
 * @param key Catalog key of the agent.
 * @return The argument string, or null when the CLI cannot resume.
 */
export function resumeArgsFor(key: string): string | null {
  return RESUME_ARGS[key] ?? null;
}

/**
 * @notice Looks an agent up by key.
 * @param key Catalog key.
 * @return The entry, or undefined for an unknown key.
 */
export function agentByKey(key: string): AgentCli | undefined {
  return AGENT_CLIS.find((entry) => entry.key === key);
}

/**
 * @notice Filters the catalog to the CLIs installed on this machine.
 * @dev The picker only offers what the user actually has; outside the desktop
 * shell every entry is kept, so the browser preview still shows the full catalog.
 * @param agents Catalog to filter; defaults to the whole catalog.
 * @return The installed entries.
 */
export async function installedAgents(
  agents: AgentCli[] = AGENT_CLIS,
): Promise<AgentCli[]> {
  if (!isTauri()) {
    return agents;
  }
  const available = await invoke<string[]>("command_availability", {
    commands: agents.map((agent) => agent.command),
  });
  return agents.filter((agent) => available.includes(agent.command));
}
