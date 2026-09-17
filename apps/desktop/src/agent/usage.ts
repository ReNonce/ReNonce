/**
 * @title Agent usage
 * @notice Rolling limit windows of the agent CLIs, as the backend reads them.
 * @dev Providers publish usage in different places — Codex writes plan windows
 * into its rollout logs, others only report inside their TUI. The backend owns
 * that knowledge; this layer only names the results, so a provider that cannot be
 * read simply does not appear instead of showing a guess.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";

/** One rolling limit window of a provider. */
export interface UsageWindow {
  /** Window label such as `5h` or `7d`. */
  label: string;
  /** Share already used, 0..=100. */
  usedPercent: number;
  /** Window length in minutes. */
  windowMinutes: number;
  /** Unix seconds when the window resets. */
  resetsAt: number;
}

/** Usage of one agent CLI. */
export interface AgentUsage {
  /** Agent key from the catalog, e.g. `codex`. */
  agentKey: string;
  /** File the numbers were read from. */
  source: string;
  windows: UsageWindow[];
  /** Unix seconds of the reading. */
  readAt: number;
}

/**
 * @notice Reads the usage limits of one agent.
 * @dev Per agent on purpose: with a large catalog only a few providers publish
 * readable limits, so the panel asks for the one the user selected.
 * @param agentKey Agent key from the catalog, e.g. `codex`.
 * @return The provider's usage, or null when it cannot be read.
 */
export async function readAgentUsage(agentKey: string): Promise<AgentUsage | null> {
  if (!isTauri()) {
    return null;
  }
  return invoke<AgentUsage | null>("agent_usage", { agentKey });
}

/**
 * @notice Why an agent's limits cannot be read right now.
 * @dev Each agent publishes usage somewhere different, and most keep it inside
 * their own interface: recorded per provider so the panel can say what would be
 * needed instead of leaving a bare "not readable". Wording stays short — it is
 * shown next to the agent.
 */
const USAGE_NOTES: Record<string, string> = {
  codex: "Read from Codex's own rollout logs.",
  claude:
    "Claude Code only exposes plan limits to a statusline hook, and none is writing them out yet.",
  gemini: "Gemini CLI reports quota only inside its interactive interface.",
  grok: "Grok needs a session id (grok usage <session>), so it has no account-wide number.",
  opencode: "opencode reports tokens and cost (opencode stats), not plan windows.",
  copilot: "Copilot CLI does not expose usage to other programs.",
};

/**
 * @notice Explanation for a provider without readable data.
 * @param agentKey Agent key from the catalog.
 * @return A short sentence, or a generic one for unknown keys.
 */
export function usageNote(agentKey: string): string {
  return USAGE_NOTES[agentKey] ?? "This agent does not publish its usage.";
}

/**
 * @notice Countdown to a window reset.
 * @param resetsAt Unix seconds.
 * @return Text such as "2h 14m", "3d 4h", or "resetting".
 */
export function untilReset(resetsAt: number): string {
  const seconds = resetsAt - Math.floor(Date.now() / 1000);
  if (resetsAt === 0 || seconds <= 0) {
    return "resetting";
  }
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

/**
 * @notice Severity bucket behind the chip colors.
 * @param usedPercent Share of the window used.
 * @return "low", "medium", or "high".
 */
export function usageLevel(usedPercent: number): "low" | "medium" | "high" {
  if (usedPercent >= 90) {
    return "high";
  }
  if (usedPercent >= 70) {
    return "medium";
  }
  return "low";
}
