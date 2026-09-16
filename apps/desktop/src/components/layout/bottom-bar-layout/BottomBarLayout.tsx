/**
 * @title Bottom bar layout
 * @notice Fixed chrome below the content area — VS Code-style bottom bar.
 * @dev Border on the top edge only (content sits above).
 * @return The bottom bar element.
 */
import "./BottomBarLayout.css";

export function BottomBarLayout() {
  return (
    <footer className="bottom-bar-layout">{/* Bottom bar content goes here */}</footer>
  );
}
