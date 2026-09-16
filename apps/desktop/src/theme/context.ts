/**
 * @title Theme context
 * @notice Holds the shared theme state exposed by `<ThemeProvider>`.
 * @dev Kept separate from the provider component so React fast refresh can
 * update the provider without resetting consumers' state.
 */
import { createContext } from "react";
import type { Theme, ThemeColors, ThemeVariantName, TerminalColors } from "./types";

/** User preference: an explicit mode, or follow the OS setting. */
export type ThemeMode = "light" | "dark" | "system";

/** Mode actually applied to the UI; "system" is resolved to one of these. */
export type ResolvedMode = ThemeVariantName;

/** Value returned by `useTheme()`. */
export interface ThemeContextValue {
  /** The active theme module. */
  theme: Theme;
  /** Id of the active theme (always a registry id). */
  themeId: string;
  /** The user's mode preference, including "system". */
  mode: ThemeMode;
  /** The concrete mode in effect after resolving "system". */
  resolvedMode: ResolvedMode;
  /** Color tokens of the applied variant (also exposed as CSS variables). */
  colors: ThemeColors;
  /** Terminal palette of the applied variant (JS-only, e.g. for xterm). */
  terminal: TerminalColors;
  /** Selects a theme by registry id; unknown ids are ignored. */
  setThemeId: (id: string) => void;
  /** Changes the mode preference. */
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
