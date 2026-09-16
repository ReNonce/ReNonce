/**
 * @title Theme provider
 * @notice Applies the active theme as CSS variables on `<html>`, resolves the
 * light/dark/system mode, and persists the user's selection in localStorage.
 * @dev Design notes:
 * - Variant fallback: a dark-only theme (dracula, kanagawa-dragon,
 *   tokyo-night) keeps its dark variant when the resolved mode is light.
 * - Variables are set in `useLayoutEffect`, so the first paint already has
 *   the theme applied — no flash.
 * - `colors` and `terminal` stay available from JS: CSS variables only cover
 *   UI colors, while xterm-style consumers need the ANSI palette as data.
 * - Storage key `renonce.theme` holds `{"themeId":"xcode","mode":"system"}`;
 *   invalid or unknown values fall back to the defaults.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ThemeContext } from "./context";
import type { ResolvedMode, ThemeContextValue, ThemeMode } from "./context";
import { DEFAULT_THEME_ID, getTheme, resolveVariant, themeById } from "./registry";
import { colorsToCssVars } from "./tokens";

const STORAGE_KEY = "renonce.theme";
const DEFAULT_MODE: ThemeMode = "system";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeSelection {
  themeId: string;
  mode: ThemeMode;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredSelection(): ThemeSelection | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { themeId, mode } = parsed as { themeId?: unknown; mode?: unknown };
    if (typeof themeId !== "string" || !themeById.has(themeId)) {
      return null;
    }
    if (!isThemeMode(mode)) {
      return null;
    }
    return { themeId, mode };
  } catch {
    return null;
  }
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Theme used when nothing is stored yet. */
  defaultThemeId?: string;
  /** Mode used when nothing is stored yet. */
  defaultMode?: ThemeMode;
}

/**
 * @notice Provides the theme context and applies tokens to the document.
 * @param props.children Views that consume the theme.
 * @param props.defaultThemeId Initial theme id (defaults to the registry default).
 * @param props.defaultMode Initial mode (defaults to "system").
 * @return The provider element wrapping `children`.
 */
export function ThemeProvider({
  children,
  defaultThemeId = DEFAULT_THEME_ID,
  defaultMode = DEFAULT_MODE,
}: ThemeProviderProps) {
  const [selection, setSelection] = useState<ThemeSelection>(
    () => readStoredSelection() ?? { themeId: defaultThemeId, mode: defaultMode },
  );
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(SYSTEM_DARK_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setThemeId = useCallback((id: string) => {
    if (!themeById.has(id)) {
      return;
    }
    setSelection((current) => ({ ...current, themeId: id }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setSelection((current) => ({ ...current, mode }));
  }, []);

  const theme = getTheme(selection.themeId);
  const resolvedMode: ResolvedMode =
    selection.mode === "system" ? (systemDark ? "dark" : "light") : selection.mode;
  const variant = resolveVariant(theme, resolvedMode);

  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(colorsToCssVars(variant.colors))) {
      root.style.setProperty(name, value);
    }
    root.dataset.theme = theme.id;
    root.dataset.mode = resolvedMode;
    root.style.colorScheme = resolvedMode;
  }, [theme, variant, resolvedMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // Storage can be unavailable (quota, private mode) — state still works in memory.
    }
  }, [selection]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeId: selection.themeId,
      mode: selection.mode,
      resolvedMode,
      colors: variant.colors,
      terminal: variant.terminal,
      setThemeId,
      setMode,
    }),
    [theme, selection.themeId, selection.mode, resolvedMode, variant, setThemeId, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
