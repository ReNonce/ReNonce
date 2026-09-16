/**
 * @title Settings menu
 * @notice Nav column of the settings screen — group headings with clickable
 * section cards (icon + label), on the same surface as the app sidebar.
 * @dev Groups come from the caller so the menu stays generic; the selected
 * card is exposed through `aria-current`.
 */
import type { ReactNode } from "react";
import "./SettingsMenu.css";

export interface SettingsSectionItem {
  /** Stable key of the section. */
  key: string;
  /** Card label. */
  label: string;
  /** Card glyph (inline SVG using `currentColor`). */
  icon: ReactNode;
}

export interface SettingsMenuGroup {
  /** Heading rendered above the group's cards. */
  heading: string;
  /** Cards in this group. */
  items: SettingsSectionItem[];
}

export interface SettingsMenuProps {
  /** Groups of sections to list. */
  groups: SettingsMenuGroup[];
  /** Key of the selected section. */
  activeKey: string;
  /** Called with the clicked section key. */
  onSelect: (key: string) => void;
}

/**
 * @notice Renders the settings nav.
 * @param props.groups Groups of sections to list.
 * @param props.activeKey Key of the selected section.
 * @param props.onSelect Called with the clicked section key.
 * @return The settings menu element.
 */
export function SettingsMenu({ groups, activeKey, onSelect }: SettingsMenuProps) {
  return (
    <nav className="settings-menu" aria-label="Settings sections">
      {groups.map((group) => (
        <div className="settings-menu__group" key={group.heading}>
          <h3 className="settings-menu__heading">{group.heading}</h3>
          {group.items.map((item) => (
            <button
              key={item.key}
              type="button"
              className="settings-menu__item"
              aria-current={item.key === activeKey}
              onClick={() => onSelect(item.key)}
            >
              <span className="settings-menu__icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
