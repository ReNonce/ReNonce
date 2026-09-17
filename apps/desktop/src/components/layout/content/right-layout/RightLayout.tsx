/**
 * @title Right layout
 * @notice Right content panel: its own top bar — a segmented view switcher in
 * the same style as the left sidebar, plus the full-screen toggle — above a
 * scrolling content area.
 * @dev Width is fully controlled by ContentLayout — never set it from CSS. Each
 * switcher entry renders its own view, and both views are heading-only shells
 * until their content is decided. Full screen is the panel growing to the whole
 * content row: `ContentLayout` owns that state, because hiding the other two
 * columns is a layout decision.
 */
import { useState } from "react";
import { AuditView } from "../../../audit/audit-view/AuditView";
import { DocsView } from "../../../docs/docs-view/DocsView";
import { MaskIcon } from "../../../icons/mask-icon/MaskIcon";
import { PanelHeader } from "../../panel-header/PanelHeader";
import { ViewSwitcher } from "../../view-switcher/ViewSwitcher";
import "./RightLayout.css";

/** What the right panel shows. */
type RightView = "audit" | "docs";

/**
 * Views shown in the panel switcher, in order.
 * @dev Audit wears the app's own mark — the transparent `Icon-only` brand
 * variant — masked like every other switcher glyph so it takes the segment's
 * colour instead of the white artwork, which would vanish on a light sidebar.
 */
const RIGHT_VIEW_ITEMS: { key: RightView; label: string; iconSrc: string }[] = [
  {
    key: "audit",
    label: "Audit",
    iconSrc: "/assets/brand/ReNonce-Icon-only-1024x1024/ReNonce-Icon-only-1024x1024.svg",
  },
  { key: "docs", label: "Docs", iconSrc: "/assets/icons/book.svg" },
];

export interface RightLayoutProps {
  /** Panel width in pixels, driven by the ContentLayout resizer. */
  width: number;
  /** Whether the panel currently fills the whole content row. */
  fullScreen: boolean;
  /** Toggles the full-screen state in ContentLayout. */
  onToggleFullScreen: () => void;
}

/**
 * @notice Renders the right panel.
 * @param props.width Panel width in pixels.
 * @param props.fullScreen Whether the panel fills the content row.
 * @param props.onToggleFullScreen Called by the full-screen button.
 * @return The right panel element.
 */
export function RightLayout({ width, fullScreen, onToggleFullScreen }: RightLayoutProps) {
  const [view, setView] = useState<RightView>("audit");

  return (
    <aside className="right-layout" style={{ width }}>
      <PanelHeader>
        <button
          type="button"
          className="right-layout__full-screen"
          title={fullScreen ? "Exit full screen" : "Full screen"}
          aria-label={fullScreen ? "Exit full screen" : "Full screen"}
          aria-pressed={fullScreen}
          onClick={onToggleFullScreen}
        >
          <MaskIcon src={fullScreen ? "/assets/icons/minimize.svg" : "/assets/icons/maximize.svg"} />
        </button>
        <div className="right-layout__views">
          <ViewSwitcher
            items={RIGHT_VIEW_ITEMS.map((item) => ({
              key: item.key,
              label: item.label,
              icon: <MaskIcon src={item.iconSrc} size={18} />,
            }))}
            activeKey={view}
            onSelect={(key) => {
              if (key === "audit" || key === "docs") {
                setView(key);
              }
            }}
            label="Right view"
          />
        </div>
      </PanelHeader>
      <div className="right-layout__content">
        {view === "audit" ? <AuditView /> : <DocsView />}
      </div>
    </aside>
  );
}
