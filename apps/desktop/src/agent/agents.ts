/**
 * @title Agent catalog
 * @notice The agent CLIs a session can launch: label, icon from the local
 * collection, and the command typed into a fresh terminal.
 * @dev Commands are plain launcher names the shell resolves from PATH, so a CLI
 * that is not installed simply prints its own "command not found" inside the
 * session — nothing here needs to probe the system.
 */

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
];

/**
 * @notice Looks an agent up by key.
 * @param key Catalog key.
 * @return The entry, or undefined for an unknown key.
 */
export function agentByKey(key: string): AgentCli | undefined {
  return AGENT_CLIS.find((entry) => entry.key === key);
}
