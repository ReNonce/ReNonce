/**
 * @title Top bar layout
 * @notice Fixed chrome above the content area — VS Code-style top bar.
 * @dev Border on the bottom edge only (content sits below). The custom window
 * titlebar with the Tauri drag region will move in here later (AGENT.md §7).
 * @return The top bar element.
 */
import "./TopBarLayout.css";

export function TopBarLayout() {
  return (
    <header className="top-bar-layout">{/* Top bar content goes here */}</header>
  );
}
