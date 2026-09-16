/**
 * @title Palette shell
 * @notice Shared chrome for every palette: backdrop, panel, search field, and
 * the keyboard plumbing (Escape closes; the host handles arrows and Enter).
 * @dev Hosts own their items and selection, so the shell only renders the
 * sections it is given and forwards what the search field receives.
 */
import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import "./PaletteShell.css";

export interface PaletteShellProps {
  /** Accessible name for the dialog. */
  label: string;
  /** Search field placeholder. */
  placeholder: string;
  /** Current query. */
  query: string;
  /** Called with the new query; hosts usually reset their selection here. */
  onQueryChange: (value: string) => void;
  /** Called on Escape and on a click outside the panel. */
  onClose: () => void;
  /** Renders a "+" beside the search field when provided. */
  onAdd?: () => void;
  /** Whether the host's add form is open (drives the button state). */
  addExpanded?: boolean;
  /** Accessible name and tooltip of the add button. */
  addLabel?: string;
  /** Forwarded keys from the search field (arrows, Enter, digits). */
  onSearchKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  /** Sections and forms rendered inside the panel. */
  children: ReactNode;
}

export function PaletteShell({
  label,
  placeholder,
  query,
  onQueryChange,
  onClose,
  onAdd,
  addExpanded = false,
  addLabel = "New",
  onSearchKeyDown,
  children,
}: PaletteShellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="palette-shell" role="presentation" onPointerDown={onClose}>
      <div
        className="palette-shell__panel"
        role="dialog"
        aria-label={label}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        <div className="palette-shell__search">
          <span className="palette-shell__icon" aria-hidden="true">
            <MaskIcon src="/assets/icons/magnifying_glass.svg" />
          </span>
          <input
            ref={inputRef}
            type="search"
            className="palette-shell__input"
            placeholder={placeholder}
            aria-label={placeholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onSearchKeyDown}
          />
          {onAdd !== undefined && (
            <button
              type="button"
              className="palette-shell__add"
              aria-label={addLabel}
              aria-expanded={addExpanded}
              title={addLabel}
              onClick={onAdd}
            >
              +
            </button>
          )}
        </div>
        <div className="palette-shell__body">{children}</div>
      </div>
    </div>
  );
}
