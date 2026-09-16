/**
 * @title Context menu
 * @notice Right-click menu drawn at the pointer: label rows with optional
 * separators and disabled states.
 * @dev Fixed positioning with an edge clamp, so a menu opened near the window
 * border still fits on screen. Escape or a click anywhere outside closes it.
 */
import { useEffect, useRef, useState } from "react";
import "./ContextMenu.css";

export interface ContextMenuItem {
  /** Stable id used as the React key. */
  id: string;
  /** Row label. */
  label: string;
  /** Dims the row and blocks selection. */
  disabled?: boolean;
  /** Draws a divider above this row. */
  separatorBefore?: boolean;
  /** Runs when the row is chosen (the menu closes first). */
  onSelect?: () => void;
}

export interface ContextMenuProps {
  /** Pointer position in viewport coordinates. */
  x: number;
  /** Pointer position in viewport coordinates. */
  y: number;
  /** Rows, top to bottom. */
  items: ContextMenuItem[];
  /** Called when the menu should close. */
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    const menu = menuRef.current;
    if (menu === null) {
      return;
    }
    const rect = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node) === true) {
        return;
      }
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      style={{ left: position.left, top: position.top }}
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.separatorBefore === true && (
            <div className="context-menu__divider" role="separator" aria-hidden="true" />
          )}
          <button
            type="button"
            role="menuitem"
            className="context-menu__item"
            disabled={item.disabled === true}
            onClick={() => {
              onClose();
              item.onSelect?.();
            }}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
