/**
 * @title Center layout
 * @notice Center content panel; fills the space between the side panels.
 * @dev `flex: 1 1 0` with `min-width: 0` lets the resizers shrink it down to
 * the minimum enforced in ContentLayout.
 * @return The center panel element.
 */
import "./CenterLayout.css";

export function CenterLayout() {
  return (
    <section className="center-layout">{/* Center content goes here */}</section>
  );
}
