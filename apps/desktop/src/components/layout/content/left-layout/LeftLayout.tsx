/**
 * @title Left layout
 * @notice Left content panel, separated from the center by a resizer.
 * @dev Width is fully controlled by ContentLayout — never set it from CSS.
 */
import "./LeftLayout.css";

export interface LeftLayoutProps {
  /** Panel width in pixels, driven by the ContentLayout resizer. */
  width: number;
}

/**
 * @notice Renders the left panel.
 * @param props.width Panel width in pixels.
 * @return The left panel element.
 */
export function LeftLayout({ width }: LeftLayoutProps) {
  return (
    <aside className="left-layout" style={{ width }}>
      {/* Left panel content goes here */}
    </aside>
  );
}
