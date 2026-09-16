/**
 * @title App layout shell
 * @notice Assembles the app frame: top bar, resizable content area, bottom bar.
 * @dev Owns the sidebar visibility and active-view state shared by the top bar
 * toggles, the content row, and the bottom bar settings button; the content row
 * swaps views through `ViewSwap` (the active view widens out of the center).
 * With no folder open the workspace is replaced by the welcome screen, so the
 * first launch always starts by picking a folder. Fills the window
 * (`height: 100%` set in App.css); the bars keep fixed heights and only the
 * content row flexes. Feature views belong inside the content panels, not here.
 * @return The app shell element.
 */
import { useEffect, useState } from "react";
import { ViewSwap } from "../../animation/view-swap/ViewSwap";
import { runKeymapAction } from "../../../keymap/actions";
import { matchBinding } from "../../../keymap/keymap";
import { usePalette } from "../../../palette/palette";
import { CommandPalette } from "../../palette/command-palette/CommandPalette";
import { PaletteOverlay } from "../../palette/palette-overlay/PaletteOverlay";
import { SettingsView } from "../../settings/settings-view/SettingsView";
import { WelcomeScreen } from "../../welcome/welcome-screen/WelcomeScreen";
import { useWorkspace } from "../../../workspace/workspace";
import { BottomBarLayout } from "../bottom-bar-layout/BottomBarLayout";
import { ContentLayout } from "../content/content-layout/ContentLayout";
import { TopBarLayout } from "../top-bar-layout/TopBarLayout";
import "./AppLayout.css";

type AppView = "workspace" | "settings";

export function AppLayout() {
  const { root } = useWorkspace();
  const palette = usePalette();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [view, setView] = useState<AppView>("workspace");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const actionId = matchBinding(event);
      if (actionId === null || !runKeymapAction(actionId)) {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-layout">
      <TopBarLayout
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        onToggleLeftSidebar={() => setLeftSidebarOpen((open) => !open)}
        onToggleRightSidebar={() => setRightSidebarOpen((open) => !open)}
      />
      <ViewSwap
        activeKey={view}
        views={[
          {
            key: "workspace",
            content:
              root === null ? (
                <WelcomeScreen />
              ) : (
                <ContentLayout
                  leftSidebarOpen={leftSidebarOpen}
                  rightSidebarOpen={rightSidebarOpen}
                />
              ),
          },
          { key: "settings", content: <SettingsView /> },
        ]}
      />
      <BottomBarLayout
        settingsOpen={view === "settings"}
        onToggleSettings={() =>
          setView((current) => (current === "settings" ? "workspace" : "settings"))
        }
      />
      {palette === "bindings" && <PaletteOverlay />}
      {palette === "commands" && <CommandPalette />}
    </div>
  );
}
