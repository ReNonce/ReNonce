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
    command: "mcode",
    description: "MiniMax's coding agent",
  },
  {
    key: "antigravity",
    label: "Antigravity",
    iconSrc: "/assets/icons/ai_google.svg",
    command: "agy",
    description: "Google's agentic CLI",
  },
  {
    key: "crush",
    label: "Crush",
    iconSrc: "/assets/icons/agent.svg",
    command: "crush",
    description: "Charm's coding agent",
  },
  {
    key: "command-code",
    label: "Command Code",
    iconSrc: "/assets/icons/command.svg",
    command: "command-code",
    description: "Command Code's coding agent",
  },
  {
    key: "hermes",
    label: "Hermes",
    iconSrc: "/assets/icons/agent_two.svg",
    command: "hermes",
    description: "Hermes agent",
  },
];

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
