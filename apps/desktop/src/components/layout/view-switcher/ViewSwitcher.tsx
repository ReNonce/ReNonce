/**
 * @title View switcher
 * @notice Segmented control that switches the main view (Files / Agent):
 * merged segments in one pill, the active one lit.
 * @dev The selected key is owned by the panel that hosts the switcher
 * (LeftLayout today), so the view itself can read it once it lands.
 */
import type { ReactNode } from "react";
import "./ViewSwitcher.css";

export interface ViewSwitcherItem {
  /** Stable key of the view. */
  key: string;
  /** Segment label. */
  label: string;
  /** Segment glyph (e.g. `<MaskIcon />`). */
  icon: ReactNode;
}

export interface ViewSwitcherProps {
  /** Segments to show. */
  items: ViewSwitcherItem[];
  /** Key of the active view. */
  activeKey: string;
  /** Called with the clicked view key. */
  onSelect: (key: string) => void;
  /** Accessible name for the group (e.g. "Main view", "Git mode"). */
  label?: string;
}

/**
 * @notice Renders the switcher.
 * @param props.items Segments to show.
 * @param props.activeKey Key of the active view.
 * @param props.onSelect Called with the clicked view key.
 * @param props.label Accessible group name.
 * @return The switcher element.
 */
export function ViewSwitcher({
  items,
  activeKey,
  onSelect,
  label = "Main view",
}: ViewSwitcherProps) {
  return (
    <div className="view-switcher" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="view-switcher__item"
          aria-pressed={item.key === activeKey}
          onClick={() => onSelect(item.key)}
        >
          <span className="view-switcher__icon" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
