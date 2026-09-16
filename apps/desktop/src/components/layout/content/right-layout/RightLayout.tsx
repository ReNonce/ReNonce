/**
 * @title Right layout
 * @notice Right content panel, separated from the center by a resizer.
 * @dev Width is fully controlled by ContentLayout — never set it from CSS.
 */
import "./RightLayout.css";

export interface RightLayoutProps {
  /** Panel width in pixels, driven by the ContentLayout resizer. */
  width: number;
}

/**
 * @notice Renders the right panel.
 * @param props.width Panel width in pixels.
 * @return The right panel element.
 */
export function RightLayout({ width }: RightLayoutProps) {
  return (
    <aside className="right-layout" style={{ width }}>
      {/* Right panel content goes here */}
    </aside>
  );
}
