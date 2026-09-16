/**
 * @title Top bar layout
 * @notice Window chrome: ReNonce mark, Files menu, sidebar toggles, drag region,
 * and the window controls.
 * @dev The bar is the Tauri drag region (`data-tauri-drag-region` on the bar
 * and its spacer — only the element under the pointer matters, so the buttons
 * stay clickable). Sidebar visibility is owned by AppLayout; the toggles hide
 * while no folder is open, because the workspace is replaced by the welcome
 * screen then.
 */
import { Logo } from "../../brand/logo/Logo";
import { useWorkspace } from "../../../workspace/workspace";
import { MenuBar } from "./menu-bar/MenuBar";
import { useFileMenu } from "./menu-bar/useFileMenu";
import { SidebarToggle } from "./sidebar-toggle/SidebarToggle";
import { WindowControls } from "./window-controls/WindowControls";
import "./TopBarLayout.css";

export interface TopBarLayoutProps {
  /** Whether the left sidebar is open. */
  leftSidebarOpen: boolean;
  /** Whether the right sidebar is open. */
  rightSidebarOpen: boolean;
  /** Flips the left sidebar visibility in AppLayout. */
  onToggleLeftSidebar: () => void;
  /** Flips the right sidebar visibility in AppLayout. */
  onToggleRightSidebar: () => void;
}

/**
 * @notice Renders the top bar.
 * @param props.leftSidebarOpen Left sidebar visibility.
 * @param props.rightSidebarOpen Right sidebar visibility.
 * @param props.onToggleLeftSidebar Left sidebar toggle handler.
 * @param props.onToggleRightSidebar Right sidebar toggle handler.
 * @return The top bar element.
 */
export function TopBarLayout({
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: TopBarLayoutProps) {
  const fileMenu = useFileMenu();
  const { root } = useWorkspace();

  return (
    <header className="top-bar-layout" data-tauri-drag-region>
      <div className="top-bar-layout__group">
        <Logo variant="icon-only" size={20} className="top-bar-layout__logo" />
        <MenuBar menus={[fileMenu]} />
        {root !== null && (
          <SidebarToggle side="left" open={leftSidebarOpen} onToggle={onToggleLeftSidebar} />
        )}
      </div>
      <div className="top-bar-layout__spacer" data-tauri-drag-region />
      <div className="top-bar-layout__group">
        {root !== null && (
          <SidebarToggle side="right" open={rightSidebarOpen} onToggle={onToggleRightSidebar} />
        )}
        <WindowControls />
      </div>
    </header>
  );
}
