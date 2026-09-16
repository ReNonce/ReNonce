/**
 * @title Settings view
 * @notice Full-width settings screen that replaces the three-column workspace:
 * a menu column (same surface as the app sidebar) plus the selected section.
 * @dev The top and bottom bars stay; only the content row switches. Sections
 * live in `SECTIONS`/`CONTENT` below — adding one means one entry plus its
 * content component.
 * @return The settings screen element.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { SettingsMenu } from "../settings-menu/SettingsMenu";
import type { SettingsMenuGroup } from "../settings-menu/SettingsMenu";
import { ThemeSettings } from "../theme-settings/ThemeSettings";
import "./SettingsView.css";

function ThemeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
    </svg>
  );
}

const GROUPS: SettingsMenuGroup[] = [
  {
    heading: "Appearance",
    items: [{ key: "theme", label: "Theme", icon: <ThemeIcon /> }],
  },
];

const CONTENT: Record<string, ReactNode> = {
  theme: <ThemeSettings />,
};

export function SettingsView() {
  const [section, setSection] = useState<string>(GROUPS[0].items[0].key);

  return (
    <section className="settings-view" aria-label="Settings">
      <SettingsMenu groups={GROUPS} activeKey={section} onSelect={setSection} />
      <div className="settings-view__content">{CONTENT[section]}</div>
    </section>
  );
}
