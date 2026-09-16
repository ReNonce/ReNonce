/**
 * @title Theme settings
 * @notice First settings section: pick the color theme and the light / dark /
 * system mode. Changes apply immediately through the theme provider.
 * @dev Theme previews resolve every palette for the current mode with
 * `resolveVariant`, so a dark-only theme previews dark even in light mode.
 * Swatch colors are inline styles on purpose — they show the theme's own
 * palette, not the active one.
 */
import { resolveVariant, themeList } from "../../../theme/registry";
import { useTheme } from "../../../theme/useTheme";
import type { ThemeMode } from "../../../theme/context";
import "./ThemeSettings.css";

const MODES: ThemeMode[] = ["light", "dark", "system"];

const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeSettings() {
  const { themeId, setThemeId, mode, setMode, resolvedMode } = useTheme();

  return (
    <div className="theme-settings">
      <section className="theme-settings__group">
        <h2 className="theme-settings__title">Appearance</h2>
        <div className="theme-settings__modes" role="group" aria-label="Appearance mode">
          {MODES.map((value) => (
            <button
              key={value}
              type="button"
              className="theme-settings__mode"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {MODE_LABELS[value]}
            </button>
          ))}
        </div>
      </section>

      <section className="theme-settings__group">
        <h2 className="theme-settings__title">Theme</h2>
        <ul className="theme-settings__list">
          {themeList.map((theme) => {
            const colors = resolveVariant(theme, resolvedMode).colors;
            return (
              <li key={theme.id}>
                <button
                  type="button"
                  className="theme-settings__item"
                  aria-pressed={theme.id === themeId}
                  onClick={() => setThemeId(theme.id)}
                >
                  <span
                    className="theme-settings__swatch"
                    style={{ background: colors.background, borderColor: colors.border }}
                    aria-hidden="true"
                  >
                    <span
                      className="theme-settings__swatch-primary"
                      style={{ background: colors.primary }}
                    />
                    <span
                      className="theme-settings__swatch-foreground"
                      style={{ background: colors.foreground }}
                    />
                  </span>
                  <span className="theme-settings__meta">
                    <span className="theme-settings__name">{theme.name}</span>
                    <span className="theme-settings__description" title={theme.description}>
                      {theme.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
