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
import { CircleHalf } from "@phosphor-icons/react";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { SettingsMenu } from "../settings-menu/SettingsMenu";
import type { SettingsMenuGroup } from "../settings-menu/SettingsMenu";
import { KeymapSettings } from "../keymap-settings/KeymapSettings";
import { ThemeSettings } from "../theme-settings/ThemeSettings";
import { UsageSettings } from "../usage-settings/UsageSettings";
import "./SettingsView.css";

const GROUPS: SettingsMenuGroup[] = [
  {
    heading: "Appearance",
    items: [{ key: "theme", label: "Theme", icon: <CircleHalf size={16} /> }],
  },
  {
    heading: "General",
    items: [
      {
        key: "keymap",
        label: "Keymap",
        icon: <MaskIcon src="/assets/icons/keyboard.svg" />,
      },
      {
        key: "usage",
        label: "Usage credentials",
        icon: <MaskIcon src="/assets/icons/signal_high.svg" />,
      },
    ],
  },
];

const CONTENT: Record<string, ReactNode> = {
  theme: <ThemeSettings />,
  keymap: <KeymapSettings />,
  usage: <UsageSettings />,
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
