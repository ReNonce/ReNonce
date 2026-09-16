/**
 * @title Theme type contract
 * @notice Shape of every theme module in `src/theme/themes/`.
 * @dev The theme modules are byte-identical upstream copies that import this
 * file as `../types` — adapt this contract, never their colors. Notes:
 * - `radius` is optional (`DEFAULT_RADIUS` in `tokens.ts` fills the gap).
 * - `TerminalColors.ansi` must stay `readonly` — some modules use `as const`.
 * - `ThemeVariants` guarantees at least one variant; dracula,
 *   kanagawa-dragon, and tokyo-night ship a dark variant only.
 */

/** Color tokens for one variant (shadcn-style names). */
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  radius?: string;
}

/** Terminal palette for one variant; consumed from JS (xterm et al.), not CSS. */
export interface TerminalColors {
  cursor: string;
  cursorAccent: string;
  selection: string;
  /** 16 ANSI colors, darkest to brightest. */
  ansi: readonly string[];
}

/** One theme variant — colors plus its terminal palette. */
export interface ThemeVariant {
  colors: ThemeColors;
  terminal: TerminalColors;
}

/** Name of a theme variant. */
export type ThemeVariantName = "dark" | "light";

/** Variants of a theme; at least one is always present. */
export type ThemeVariants =
  | { dark: ThemeVariant; light?: ThemeVariant }
  | { dark?: ThemeVariant; light: ThemeVariant };

/** A full theme module. */
export interface Theme {
  /** Stable registry key, e.g. "tokyo-night". */
  id: string;
  /** Display name shown in theme pickers. */
  name: string;
  /** One-line description shown in theme pickers. */
  description: string;
  /** Upstream editor theme names this palette was derived from. */
  editorTheme: { dark?: string; light?: string };
  variants: ThemeVariants;
}
