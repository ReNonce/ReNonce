/**
 * @title App layout shell
 * @notice Assembles the app frame: top bar, resizable content area, bottom bar.
 * @dev Fills the window (`height: 100%` set in App.css); the bars keep fixed
 * heights and only the content row flexes. Feature views belong inside the
 * content panels, not here.
 * @return The app shell element.
 */
import { BottomBarLayout } from "../bottom-bar-layout/BottomBarLayout";
import { ContentLayout } from "../content/content-layout/ContentLayout";
import { TopBarLayout } from "../top-bar-layout/TopBarLayout";
import "./AppLayout.css";

export function AppLayout() {
  return (
    <div className="app-layout">
      <TopBarLayout />
      <ContentLayout />
      <BottomBarLayout />
    </div>
  );
}
