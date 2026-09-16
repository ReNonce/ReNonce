/**
 * @title Menu bar
 * @notice Desktop-style menu bar for the top bar: click a title to open its
 * dropdown, hover another title to switch while one is open, Escape or a click
 * outside closes it, and arrow keys walk the open menu.
 * @dev The dropdown is absolutely positioned inside the bar; TopBarLayout.css
 * keeps the bar above the content row so the overlay is never clipped.
 */
import { Fragment, useEffect, useRef, useState } from "react";
import "./MenuBar.css";

export interface MenuBarAction {
  /** Stable id of the action. */
  id: string;
  /** Row label. */
  label: string;
  /** Dims the row and blocks selection. */
  disabled?: boolean;
  /** Renders a check mark (toggles such as Auto Save). */
  checked?: boolean;
  /** Key binding shown on the right, e.g. "Ctrl+O". */
  shortcut?: string;
  /** Draws a divider above this row, grouping related actions. */
  separatorBefore?: boolean;
  /** Runs when the row is chosen. */
  onSelect?: () => void;
}

export interface MenuBarMenu {
  /** Stable id of the menu. */
  id: string;
  /** Title shown in the bar. */
  label: string;
  /** Rows of the dropdown, top to bottom. */
  items: MenuBarAction[];
}

export interface MenuBarProps {
  /** Menus to show, left to right. */
  menus: MenuBarMenu[];
}

/**
 * @notice Renders the menu bar.
 * @param props.menus Menus to show.
 * @return The menu bar element.
 */
export function MenuBar({ menus }: MenuBarProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openId === null) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setOpenId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenId(null);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      const dropdown = dropdownRef.current;
      if (dropdown === null) {
        return;
      }
      const items = [...dropdown.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      if (items.length === 0) {
        return;
      }
      event.preventDefault();
      const index = items.findIndex((item) => item === document.activeElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + step + items.length) % items.length;
      items[next].focus();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openId]);

  const runAction = (action: MenuBarAction) => {
    if (action.disabled === true) {
      return;
    }
    setOpenId(null);
    action.onSelect?.();
  };

  return (
    <div className="menu-bar" ref={rootRef} role="menubar">
      {menus.map((menu) => {
        const open = menu.id === openId;
        return (
          <div className="menu-bar__menu" key={menu.id}>
            <button
              type="button"
              className="menu-bar__title"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpenId((current) => (current === menu.id ? null : menu.id))}
              onPointerEnter={() => {
                if (openId !== null) {
                  setOpenId(menu.id);
                }
              }}
            >
              {menu.label}
            </button>
            {open && (
              <div className="menu-bar__dropdown" role="menu" ref={dropdownRef}>
                {menu.items.map((item) => (
                  <Fragment key={item.id}>
                    {item.separatorBefore === true && (
                      <div className="menu-bar__divider" role="separator" />
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="menu-bar__item"
                      disabled={item.disabled === true}
                      onClick={() => runAction(item)}
                    >
                      <span className="menu-bar__check" aria-hidden="true">
                        {item.checked === true ? "✓" : ""}
                      </span>
                      <span className="menu-bar__label">{item.label}</span>
                      {item.shortcut !== undefined && item.shortcut !== "" && (
                        <span className="menu-bar__shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
