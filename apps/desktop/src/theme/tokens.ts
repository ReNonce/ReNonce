/**
 * @title Theme token helpers
 * @notice Turns theme color tokens into CSS custom properties.
 * @dev Names map camelCase to kebab-case behind a `--` prefix
 * (`sidebarPrimaryForeground` -> `--sidebar-primary-foreground`), so a token
 * added to `ThemeColors` flows to CSS automatically. Terminal ANSI colors are
 * intentionally not emitted as CSS variables — consumers (xterm) read them
 * from `useTheme().terminal`.
 */
import type { TerminalColors, ThemeColors } from "./types";

/** Fallback for themes that omit the `radius` token. */
export const DEFAULT_RADIUS = "0.5rem";

/**
 * @notice Converts a camelCase token name to kebab-case.
 * @param value camelCase name, e.g. "cardForeground".
 * @return kebab-case name, e.g. "card-foreground".
 */
export function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

/**
 * @notice Builds CSS custom properties for a variant's color tokens.
 * @dev `radius` is filled with {@link DEFAULT_RADIUS} when the theme omits it,
 * so every applied theme exposes the exact same variable set — no stale
 * variables when switching themes.
 * @param colors Color tokens of the active variant.
 * @return CSS variable names mapped to values, e.g. `{ "--primary": "#007aff" }`.
 */
export function colorsToCssVars(colors: ThemeColors): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of Object.keys(colors) as Array<keyof ThemeColors>) {
    const value = colors[key];
    if (value !== undefined) {
      vars[`--${camelToKebab(key)}`] = value;
    }
  }
  if (vars["--radius"] === undefined) {
    vars["--radius"] = DEFAULT_RADIUS;
  }
  return vars;
}

/**
 * @notice Builds CSS custom properties for a variant's terminal palette.
 * @dev Exposing ANSI as variables lets CSS-only surfaces (the editor's syntax
 * theme) follow the active palette without React re-rendering — switching themes
 * repaints highlighted code for free.
 * @param terminal Terminal palette of the active variant.
 * @return Map of CSS variable name to value, e.g. `{ "--ansi-4": "#007aff" }`.
 */
export function terminalToCssVars(terminal: TerminalColors): Record<string, string> {
  const vars: Record<string, string> = {
    "--ansi-cursor": terminal.cursor,
    "--ansi-selection": terminal.selection,
  };
  terminal.ansi.forEach((color, index) => {
    vars[`--ansi-${index}`] = color;
  });
  return vars;
}
