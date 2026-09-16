/**
 * @title Bottom bar layout
 * @notice Fixed chrome below the content area — VS Code-style bottom bar with
 * the settings entry point.
 * @dev Border on the top edge only (content sits above). The settings button
 * toggles the full-width settings view; that state is owned by AppLayout.
 */
import { SettingsButton } from "./settings-button/SettingsButton";
import "./BottomBarLayout.css";

export interface BottomBarLayoutProps {
  /** Whether the settings view is showing. */
  settingsOpen: boolean;
  /** Flips the settings view in AppLayout. */
  onToggleSettings: () => void;
}

/**
 * @notice Renders the bottom bar.
 * @param props.settingsOpen Settings view visibility.
 * @param props.onToggleSettings Settings toggle handler.
 * @return The bottom bar element.
 */
export function BottomBarLayout({ settingsOpen, onToggleSettings }: BottomBarLayoutProps) {
  return (
    <footer className="bottom-bar-layout">
      <SettingsButton active={settingsOpen} onToggle={onToggleSettings} />
    </footer>
  );
}
