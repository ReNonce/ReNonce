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
  /** File or folder the numbers were read from. */
  source: string;
  windows: UsageWindow[];
  /** One-line summary for providers that report totals instead of windows. */
  detail: string | null;
  /** Unix seconds of the reading. */
  readAt: number;
}

/**
 * @notice Reads the usage limits of one agent.
 * @dev Per agent on purpose: with a large catalog only a few providers publish
 * readable limits, so the panel asks for the one the user selected.
 * @param agentKey Agent key from the catalog, e.g. `codex`.
 * @param cwd Folder of the picked session, used by per-session providers (Grok).
 * @return The provider's usage, or null when it cannot be read.
 */
export async function readAgentUsage(
  agentKey: string,
  cwd: string | null = null,
): Promise<AgentUsage | null> {
  if (!isTauri()) {
    return null;
  }
  return invoke<AgentUsage | null>("agent_usage", { agentKey, cwd });
}

/**
 * @notice Agents whose usage limits the panel can actually show.
 * @dev Account-level limits only: Codex writes its 5-hour and weekly windows to
 * disk, and Claude Code hands them to a statusline command the mirror taps.
 * Grok publishes token and cost totals per session but no account limit, so it
 * stays out of the list; providers that report nothing readable are out too.
 */
export const USAGE_AGENT_KEYS = ["claude", "codex"];

/**
 * @notice What an agent needs before its limits can be read.
 * @dev Shown next to the agent instead of a bare "not readable", so the missing
 * number is explained rather than mysterious.
 */
const USAGE_NOTES: Record<string, string> = {
  codex: "Read from Codex's own rollout logs.",
  claude:
    "Needs the statusline mirror: Claude only hands plan limits to a statusline command (see scripts/claude-usage-mirror.sh).",
  grok: "Grok reports tokens and cost per session, not an account limit.",
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
