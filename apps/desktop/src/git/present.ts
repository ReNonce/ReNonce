/**
 * @title Git presentation helpers
 * @notice Small pure helpers shared by the history and diff views: avatar hue,
 * initials, and human-readable timestamps.
 * @dev Avatar hues come from the theme's ANSI palette (`--ansi-N`), so a commit
 * list keeps its colors while staying consistent with whatever theme is active.
 */

/** ANSI slots that read as distinct hues on both light and dark themes. */
const AVATAR_SLOTS = [1, 2, 3, 4, 5, 6, 9, 10, 12, 13, 14];

/**
 * @notice Picks a stable palette slot for a seed string.
 * @param seed Usually the author email, so one person keeps one color.
 * @return An ANSI index from {@link AVATAR_SLOTS}.
 */
export function avatarSlot(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }
  return AVATAR_SLOTS[hash % AVATAR_SLOTS.length];
}

/**
 * @notice Builds one or two initials from a person's name.
 * @param name Full name, e.g. "Ada Lovelace".
 * @return Up to two uppercase initials, or "?" for an empty name.
 */
export function initials(name: string): string {
  const parts = name.split(/[\s._-]+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "?";
  }
  const first = parts[0].charAt(0);
  const second = parts.length > 1 ? parts[1].charAt(0) : "";
  return `${first}${second}`.toUpperCase();
}

/** Minute, hour, day, week, month, and year lengths in seconds. */
const UNITS: Array<{ limit: number; divisor: number; suffix: string }> = [
  { limit: 60, divisor: 1, suffix: "s" },
  { limit: 3600, divisor: 60, suffix: "m" },
  { limit: 86400, divisor: 3600, suffix: "h" },
  { limit: 604800, divisor: 86400, suffix: "d" },
  { limit: 2629800, divisor: 604800, suffix: "w" },
  { limit: 31557600, divisor: 2629800, suffix: "mo" },
  { limit: Number.POSITIVE_INFINITY, divisor: 31557600, suffix: "y" },
];

/**
 * @notice Short relative age of a timestamp, GitHub style.
 * @param iso ISO-8601 date.
 * @return Text such as "just now", "12m ago", or "3d ago".
 */
export function relativeTime(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return "";
  }
  const seconds = Math.max(0, (Date.now() - time) / 1000);
  if (seconds < 45) {
    return "just now";
  }
  const unit = UNITS.find((candidate) => seconds < candidate.limit) ?? UNITS[UNITS.length - 1];
  return `${Math.floor(seconds / unit.divisor)}${unit.suffix} ago`;
}

/**
 * @notice Calendar date of a timestamp for list grouping and headers.
 * @param iso ISO-8601 date.
 * @return A localised date such as "17 Sep 2026".
 */
export function calendarDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * @notice Groups key for a commit, used to separate days in the list.
 * @param iso ISO-8601 date.
 * @return A date-only key such as "2026-09-17".
 */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString().slice(0, 10);
}
