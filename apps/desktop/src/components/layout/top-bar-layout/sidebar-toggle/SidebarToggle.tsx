/**
 * @title Sidebar toggle
 * @notice Icon button that shows or hides one of the content sidebars.
 * @dev The glyph mirrors for the right side; visibility state lives in
 * AppLayout, so the same component is reused on both ends of the top bar.
 */
import "./SidebarToggle.css";

export interface SidebarToggleProps {
  /** Which sidebar this button controls. */
  side: "left" | "right";
  /** Whether that sidebar is currently open. */
  open: boolean;
  /** Flips that sidebar's visibility in AppLayout. */
  onToggle: () => void;
}

/**
 * @notice Renders the toggle button.
 * @param props.side Sidebar this button controls.
 * @param props.open Current visibility of that sidebar.
 * @param props.onToggle Called on click to flip visibility.
 * @return The toggle button element.
 */
export function SidebarToggle({ side, open, onToggle }: SidebarToggleProps) {
  const label = `${open ? "Hide" : "Show"} ${side} sidebar`;

  return (
    <button
      type="button"
      className="sidebar-toggle"
      aria-label={label}
      aria-pressed={open}
      title={label}
      onClick={onToggle}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect
          x="2.25"
          y="3.25"
          width="11.5"
          height="9.5"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <path
          d={side === "left" ? "M6.5 3.25v9.5" : "M9.5 3.25v9.5"}
          stroke="currentColor"
          strokeWidth="1.1"
        />
      </svg>
    </button>
  );
}
