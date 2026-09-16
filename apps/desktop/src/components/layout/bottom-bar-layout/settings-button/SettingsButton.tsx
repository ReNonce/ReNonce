/**
 * @title Settings button
 * @notice Gear icon in the bottom bar; toggles the full-width settings view.
 * @dev Active state is exposed through `aria-pressed` and an accent
 * background, so the same button also closes the settings view.
 */
import "./SettingsButton.css";

export interface SettingsButtonProps {
  /** Whether the settings view is showing. */
  active: boolean;
  /** Flips the settings view in AppLayout. */
  onToggle: () => void;
}

/**
 * @notice Renders the settings gear button.
 * @param props.active Settings view visibility.
 * @param props.onToggle Called on click to flip the view.
 * @return The settings button element.
 */
export function SettingsButton({ active, onToggle }: SettingsButtonProps) {
  const label = active ? "Close settings" : "Open settings";

  return (
    <button
      type="button"
      className="settings-button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onToggle}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
