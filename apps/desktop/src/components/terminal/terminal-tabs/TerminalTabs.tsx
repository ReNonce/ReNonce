/**
 * @title Terminal tabs
 * @notice Horizontally scrollable tab strip for the center panel header: a close
 * button per tab, and a "+" that opens an overlay of terminal profiles (the
 * default shell plus every shell the backend reports).
 * @dev Tabs keep their intrinsic width (`flex: 0 0 auto`) and the strip scrolls
 * on the x axis with a hidden scrollbar, so overflowing tabs slide instead of
 * squeezing. The + overlay is `position: fixed` because the strip clips its own
 * overflow — an absolutely positioned menu would be cut off.
 */
import { useEffect, useRef, useState } from "react";
import type { WheelEvent as ReactWheelEvent } from "react";
import { Terminal as TerminalIcon } from "@phosphor-icons/react";
import { useKeymap } from "../../../keymap/keymap";
import { listShells } from "../../../terminal/shells";
import type { ShellInfo } from "../../../terminal/shells";
import { CommandRow } from "../../command/command-row/CommandRow";
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
export function TerminalTabs({ tabs, activeId, onSelect, onClose, onOpen }: TerminalTabsProps) {
  const bindings = useKeymap();
  const [menuOpen, setMenuOpen] = useState(false);
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
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
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
    if (shells.length === 0) {
      void listShells().then(setShells);
    }
  };

  const choose = (shell: string | null) => {
    setMenuOpen(false);
    onOpen(shell);
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
          >
            <button
              type="button"
              role="tab"
              className="terminal-tabs__tab"
              aria-selected={active}
              title={tab.label}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
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
          <CommandRow
            icon={<TerminalIcon size={16} />}
            label="New Terminal"
            hint={bindings["file.newTerminal"]}
            onSelect={() => choose(null)}
          />
          {shells.length > 0 && <div className="terminal-tabs__menu-divider" role="separator" />}
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
  );
}
