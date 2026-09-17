/**
 * @title Terminal tabs
 * @notice Horizontally scrollable tab strip for the center panel header: a close
 * button per tab, and a "+" that opens a two-level overlay — categories first
 * (Terminal), then the terminal types (default shell plus every shell the
 * backend reports). Tabs rename in place on double-click, or from their
 * right-click menu, and a blank name falls back to the automatic one.
 * @dev Tabs keep their intrinsic width (`flex: 0 0 auto`) and the strip scrolls
 * on the x axis with a hidden scrollbar, so overflowing tabs slide instead of
 * squeezing. The + overlay is `position: fixed` because the strip clips its own
 * overflow — an absolutely positioned menu would be cut off; the second level is
 * absolute inside it and opens leftwards, away from the window edge. The
 * category row opens on hover and toggles on click, and the level below stays
 * flush with it so the pointer never crosses a gap.
 */
import { useEffect, useRef, useState } from "react";
import type { WheelEvent as ReactWheelEvent } from "react";
import { CaretRight, Terminal as TerminalIcon } from "@phosphor-icons/react";
import { useKeymap } from "../../../keymap/keymap";
import { listShells } from "../../../terminal/shells";
import type { ShellInfo } from "../../../terminal/shells";
import { CommandRow } from "../../command/command-row/CommandRow";
import { ContextMenu } from "../../ui/context-menu/ContextMenu";
import "./TerminalTabs.css";

export interface TerminalTab {
  /** Stable id of the session. */
  id: string;
  /** Label shown on the tab. */
  label: string;
}

export interface TerminalTabsProps {
  /** Tabs to show, left to right. */
  tabs: TerminalTab[];
  /** Id of the active tab. */
  activeId: string;
  /** Called with the clicked tab id. */
  onSelect: (id: string) => void;
  /** Closes a tab; the panel stays empty until a new session is opened. */
  onClose: (id: string) => void;
  /** Opens a terminal; a null shell means the platform default. */
  onOpen: (shell: string | null) => void;
  /** Renames a tab; a blank name restores the automatic label. */
  onRename: (id: string, label: string) => void;
  /** Closes every tab except the given one. */
  onCloseOthers: (id: string) => void;
  /** Closes every tab. */
  onCloseAll: () => void;
}

/**
 * @notice Renders the terminal tab strip.
 * @param props.tabs Tabs to show.
 * @param props.activeId Id of the active tab.
 * @param props.onSelect Called with the clicked tab id.
 * @param props.onClose Called with the tab id to close.
 * @param props.onOpen Called with the chosen shell (null for the default).
 * @return The tab strip element.
 */
export function TerminalTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
  onOpen,
  onRename,
  onCloseOthers,
  onCloseAll,
}: TerminalTabsProps) {
  const bindings = useKeymap();
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [tabMenu, setTabMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [shells, setShells] = useState<ShellInfo[]>([]);
  const addRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) === true) {
        return;
      }
      if (addRef.current?.contains(target) === true) {
        return;
      }
      setMenuOpen(false);
      setSubmenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSubmenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    const rect = addRef.current?.getBoundingClientRect();
    if (rect !== undefined) {
      // Anchored to the button's right edge: the overlay has a fixed width and
      // the + sits close to the window edge, so it grows leftwards.
      setPosition({ top: rect.bottom + 4, right: Math.round(window.innerWidth - rect.right) });
    }
    setMenuOpen((current) => !current);
    setSubmenuOpen(false);
    if (shells.length === 0) {
      void listShells().then(setShells);
    }
  };

  const choose = (shell: string | null) => {
    setMenuOpen(false);
    setSubmenuOpen(false);
    onOpen(shell);
  };

  const commitRename = () => {
    if (editing === null) {
      return;
    }
    const { id, value } = editing;
    setEditing(null);
    onRename(id, value);
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    // A vertical wheel over a horizontal-only scroller does nothing by default;
    // map it so overflowing tabs scroll like a browser tab strip.
    if (event.deltaY === 0) {
      return;
    }
    event.currentTarget.scrollLeft += event.deltaY;
  };

  return (
    <div className="terminal-tabs">
      <div className="terminal-tabs__strip" role="tablist" onWheel={onWheel}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            className="terminal-tabs__item"
            role="presentation"
            data-active={active}
            onContextMenu={(event) => {
              event.preventDefault();
              setTabMenu({ x: event.clientX, y: event.clientY, id: tab.id });
            }}
          >
            {editing?.id === tab.id ? (
              <input
                autoFocus
                className="terminal-tabs__rename"
                aria-label={`Rename ${tab.label}`}
                value={editing.value}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setEditing({ id: tab.id, value: event.target.value })}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitRename();
                  }
                  if (event.key === "Escape") {
                    setEditing(null);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                role="tab"
                className="terminal-tabs__tab"
                aria-selected={active}
                title={`${tab.label} — double-click to rename`}
                onClick={() => onSelect(tab.id)}
                onDoubleClick={() => setEditing({ id: tab.id, value: tab.label })}
              >
                {tab.label}
              </button>
            )}
            <button
              type="button"
              className="terminal-tabs__close"
              aria-label={`Close ${tab.label}`}
              onClick={() => onClose(tab.id)}
            >
              ×
            </button>
          </div>
        );
      })}
      </div>
      <span className="terminal-tabs__fade" aria-hidden="true" />
      <button
        ref={addRef}
        type="button"
        className="terminal-tabs__add"
        title="New terminal"
        aria-label="New terminal"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
      >
        +
      </button>
      {menuOpen && (
        <div
          ref={menuRef}
          className="terminal-tabs__menu"
          role="menu"
          style={{ top: position.top, right: position.right }}
        >
          <div
            className="terminal-tabs__group"
            onMouseEnter={() => setSubmenuOpen(true)}
            onMouseLeave={() => setSubmenuOpen(false)}
          >
            <button
              type="button"
              className="terminal-tabs__group-row"
              data-open={submenuOpen}
              aria-haspopup="menu"
              aria-expanded={submenuOpen}
              onClick={() => setSubmenuOpen((current) => !current)}
            >
              <TerminalIcon size={16} />
              <span className="terminal-tabs__group-label">Terminal</span>
              <CaretRight size={12} className="terminal-tabs__caret" />
            </button>
            {submenuOpen && (
              <div className="terminal-tabs__submenu" role="menu">
                <CommandRow
                  icon={<TerminalIcon size={16} />}
                  label="New Terminal"
                  hint={bindings["file.newTerminal"]}
                  onSelect={() => choose(null)}
                />
                {shells.length > 0 && (
                  <div className="terminal-tabs__menu-divider" role="separator" />
                )}
                {shells.map((shell) => (
                  <CommandRow
                    key={shell.path}
                    icon={<TerminalIcon size={16} />}
                    label={shell.name}
                    onSelect={() => choose(shell.path)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tabMenu !== null && (
        <ContextMenu
          x={tabMenu.x}
          y={tabMenu.y}
          onClose={() => setTabMenu(null)}
          items={[
            {
              id: "rename",
              label: "Rename",
              onSelect: () => {
                const tab = tabs.find((item) => item.id === tabMenu.id);
                setEditing({ id: tabMenu.id, value: tab?.label ?? "" });
              },
            },
            {
              id: "close",
              label: "Close",
              separatorBefore: true,
              onSelect: () => onClose(tabMenu.id),
            },
            {
              id: "close-others",
              label: "Close Others",
              disabled: tabs.length < 2,
              onSelect: () => onCloseOthers(tabMenu.id),
            },
            {
              id: "close-all",
              label: "Close All",
              onSelect: onCloseAll,
            },
          ]}
        />
      )}
    </div>
  );
}
