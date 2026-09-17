/**
 * @title Left layout
 * @notice Left content panel: its own top bar carrying the main view switcher
 * (Files / Agent), plus a scrolling content area; separated from the center by
 * a resizer.
 * @dev Width is fully controlled by ContentLayout — never set it from CSS. The
 * selected view is shared through the `view/main-view` store, so the keymap
 * listener can switch it too.
 */
import { AgentView } from "../../../agent/agent-view/AgentView";
import { FileExplorer } from "../../../files/file-explorer/FileExplorer";
import { MaskIcon } from "../../../icons/mask-icon/MaskIcon";
import { MAIN_VIEW_ITEMS, setMainView, useMainView } from "../../../../view/main-view";
import { PanelHeader } from "../../panel-header/PanelHeader";
import { ViewSwitcher } from "../../view-switcher/ViewSwitcher";
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
  const mainView = useMainView();

  return (
    <aside className="left-layout" style={{ width }}>
      <PanelHeader>
        <ViewSwitcher
          items={MAIN_VIEW_ITEMS.map((item) => ({
            key: item.key,
            label: item.label,
            icon: <MaskIcon src={item.iconSrc} size={18} />,
          }))}
          activeKey={mainView}
          onSelect={(key) => {
            if (key === "files" || key === "agent") {
              setMainView(key);
            }
          }}
        />
      </PanelHeader>
      <div className="left-layout__content">
        {mainView === "files" ? <FileExplorer /> : <AgentView />}
      </div>
    </aside>
  );
}
