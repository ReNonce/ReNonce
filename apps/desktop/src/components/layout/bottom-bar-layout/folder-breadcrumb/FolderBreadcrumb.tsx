/**
 * @title Folder breadcrumb
 * @notice Bottom-bar files navigation: one chip per level of the open folder,
 * with the current level emphasized. Clicking a level opens it as the
 * workspace; right-clicking one offers the folder actions plus closing that
 * level; the trailing `+` steps into a folder inside the current one.
 * @dev Deep paths are trimmed to the three deepest levels — the rest collapse
 * into a `…` chip that lists them in a menu, so the bar never turns into a
 * wall of text. Hidden while no folder is open, and the strip scrolls
 * horizontally rather than pushing the settings gear around.
 */
import { useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { listDirectory } from "../../../../files/directory";
import { parentLevel, pathSegments } from "../../../../files/path";
import { openTerminal } from "../../../../terminal/sessions";
import { setWorkspaceRoot, useWorkspace } from "../../../../workspace/workspace";
import { ContextMenu } from "../../../ui/context-menu/ContextMenu";
import type { ContextMenuItem } from "../../../ui/context-menu/ContextMenu";
import "./FolderBreadcrumb.css";

/** Levels kept visible; anything above collapses into the `…` chip. */
const MAX_VISIBLE_LEVELS = 3;

interface MenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export function FolderBreadcrumb() {
  const { root } = useWorkspace();
  const [menu, setMenu] = useState<MenuState | null>(null);

  if (root === null) {
    return null;
  }

  const segments = pathSegments(root);
  const hiddenCount = Math.max(0, segments.length - MAX_VISIBLE_LEVELS);

  const openMenu = (event: ReactMouseEvent, items: ContextMenuItem[]) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, items });
  };

  const levelItems = (path: string): ContextMenuItem[] => [
    {
      id: "open",
      label: "Open Folder",
      disabled: path === root,
      onSelect: () => setWorkspaceRoot(path),
    },
    {
      id: "reveal",
      label: "Reveal in File Manager",
      separatorBefore: true,
      onSelect: () => void revealItemInDir(path).catch(() => undefined),
    },
    {
      id: "terminal",
      label: "Open in Terminal",
      onSelect: () => openTerminal(path, null),
    },
    {
      id: "copy-path",
      label: "Copy Path",
      separatorBefore: true,
      onSelect: () => {
        void navigator.clipboard.writeText(path).catch(() => undefined);
      },
    },
    {
      id: "close-level",
      label: "Close Folder Level",
      separatorBefore: true,
      onSelect: () => setWorkspaceRoot(parentLevel(path)),
    },
  ];

  const hiddenItems: ContextMenuItem[] = segments
    .slice(0, hiddenCount)
    .map((segment) => ({
      id: `hidden-${segment.path}`,
      label: segment.path,
      onSelect: () => setWorkspaceRoot(segment.path),
    }));

  const openChildren = async (event: ReactMouseEvent) => {
    event.preventDefault();
    const { clientX: x, clientY: y } = event;
    try {
      const folders = (await listDirectory(root)).filter((entry) => entry.isDir);
      setMenu({
        x,
        y,
        items:
          folders.length === 0
            ? [{ id: "empty", label: "No folder inside", disabled: true }]
            : folders.map((folder) => ({
                id: folder.path,
                label: folder.name,
                onSelect: () => setWorkspaceRoot(folder.path),
              })),
      });
    } catch {
      setMenu({
        x,
        y,
        items: [{ id: "unreadable", label: "Cannot read this folder", disabled: true }],
      });
    }
  };

  return (
    <nav className="folder-breadcrumb" aria-label="Open folder">
      <div className="folder-breadcrumb__strip">
        {hiddenCount > 0 && (
          <span className="folder-breadcrumb__level">
            <button
              type="button"
              className="folder-breadcrumb__chip"
              title={`Show ${hiddenCount} more levels`}
              onClick={(event) => openMenu(event, hiddenItems)}
            >
              …
            </button>
            <CaretRight size={12} className="folder-breadcrumb__separator" aria-hidden="true" />
          </span>
        )}

        {segments.slice(hiddenCount).map((segment, index) => (
          <span key={segment.path} className="folder-breadcrumb__level">
            {index > 0 && (
              <CaretRight size={12} className="folder-breadcrumb__separator" aria-hidden="true" />
            )}
            <button
              type="button"
              className="folder-breadcrumb__chip"
              data-current={segment.path === root}
              title={segment.path}
              onClick={() => setWorkspaceRoot(segment.path)}
              onContextMenu={(event) => openMenu(event, levelItems(segment.path))}
            >
              {segment.name}
            </button>
          </span>
        ))}

        <span className="folder-breadcrumb__level">
          <CaretRight size={12} className="folder-breadcrumb__separator" aria-hidden="true" />
          <button
            type="button"
            className="folder-breadcrumb__chip folder-breadcrumb__chip--step-in"
            aria-label="Open a folder inside this one"
            title="Open a folder inside this one"
            onClick={(event) => void openChildren(event)}
          >
            +
          </button>
        </span>
      </div>

      {menu !== null && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />
      )}
    </nav>
  );
}
