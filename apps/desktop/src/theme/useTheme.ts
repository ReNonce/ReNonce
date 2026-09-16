/**
 * @title useTheme hook
 * @notice Reads the active theme (tokens + setters) from the nearest provider.
 * @dev Throws outside a provider so misuse fails fast instead of rendering
 * with undefined tokens.
 */
import { useContext } from "react";
import { ThemeContext } from "./context";
import type { ThemeContextValue } from "./context";

/**
 * @notice Accesses the theme context.
 * @return The theme context value: active theme, mode, tokens, and setters.
 */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme must be used inside a <ThemeProvider>.");
  }
  return value;
}
