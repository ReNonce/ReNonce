/**
 * @title Theme registry
 * @notice Lists every available theme and resolves themes by id.
 * @dev Adding a theme: drop the module in `themes/` (byte-identical upstream
 * copy) and add one import plus one entry below. `themeList` is sorted
 * alphabetically by display name, so pickers can render it as-is.
 */
import type { Theme, ThemeVariant, ThemeVariantName } from "./types";
import { caffeine } from "./themes/caffeine";
import { catppuccin } from "./themes/catppuccin";
import { claude } from "./themes/claude";
import { dracula } from "./themes/dracula";
import { everforest } from "./themes/everforest";
import { gruvbox } from "./themes/gruvbox";
import { kanagawa } from "./themes/kanagawa";
import { kanagawaDragon } from "./themes/kanagawa-dragon";
import { nord } from "./themes/nord";
import { rosePine } from "./themes/rose-pine";
import { sage } from "./themes/sage";
import { solarized } from "./themes/solarized";
import { tide } from "./themes/tide";
import { tokyoNight } from "./themes/tokyo-night";
import { xcode } from "./themes/xcode";

/** Theme applied before the user picks one. */
export const DEFAULT_THEME_ID = "xcode";

/** All themes, sorted by display name. */
export const themeList: Theme[] = [
  caffeine,
  catppuccin,
  claude,
  dracula,
  everforest,
  gruvbox,
  kanagawa,
  kanagawaDragon,
  nord,
  rosePine,
  sage,
  solarized,
  tide,
  tokyoNight,
  xcode,
].sort((a, b) => a.name.localeCompare(b.name));

/** Lookup table for the registry ids. */
export const themeById: ReadonlyMap<string, Theme> = new Map(
  themeList.map((theme) => [theme.id, theme]),
);

const defaultTheme: Theme =
  themeList.find((theme) => theme.id === DEFAULT_THEME_ID) ?? themeList[0];

/**
 * @notice Resolves a theme by id.
 * @dev Falls back to the default theme so a stale id (e.g. old localStorage)
 * can never blank the UI.
 * @param id Theme id, e.g. "xcode".
 * @return The theme to apply.
 */
export function getTheme(id: string): Theme {
  return themeById.get(id) ?? defaultTheme;
}

/**
 * @notice Picks the variant to apply for a mode.
 * @dev Fallback chain: requested mode, then dark, then light — a dark-only
 * theme (dracula, kanagawa-dragon, tokyo-night) keeps its dark variant when
 * the resolved mode is light.
 * @param theme Theme to resolve.
 * @param mode "light" or "dark".
 * @return The variant to apply.
 */
export function resolveVariant(theme: Theme, mode: ThemeVariantName): ThemeVariant {
  const variant = theme.variants[mode] ?? theme.variants.dark ?? theme.variants.light;
  if (variant === undefined) {
    throw new Error(`Theme "${theme.id}" defines no variants.`);
  }
  return variant;
}
