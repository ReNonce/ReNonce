/**
 * @title Right layout
 * @notice Right content panel: its own top bar plus a scrolling content area,
 * separated from the center by a resizer.
 * @dev Width is fully controlled by ContentLayout — never set it from CSS.
 */
import { PanelHeader } from "../../panel-header/PanelHeader";
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
      <PanelHeader />
      <div className="right-layout__content">{/* Right panel content goes here */}</div>
    </aside>
  );
}
