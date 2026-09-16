/**
 * @title Select
 * @notice Custom select: a button showing the current value plus a small themed
 * popover list, replacing native `<select>` whose OS dropdown ignores the app's
 * theme and sizing.
 * @dev The list is `position: fixed` so it escapes scrolling containers (palette
 * bodies, panel headers) instead of being clipped by their overflow. Escape is
 * handled in the capture phase so it closes the list only — not the palette
 * behind it.
 */
import { useEffect, useRef, useState } from "react";
import "./Select.css";

export interface SelectOption {
  /** Value reported when the option is picked. */
  value: string;
  /** Text shown on the trigger and the option row. */
  label: string;
}

export interface SelectProps {
  /** Accessible name of the control. */
  label: string;
  /** Currently selected value. */
  value: string;
  /** Options to choose from. */
  options: SelectOption[];
  /** Called with the picked value. */
  onChange: (value: string) => void;
  /** Extra classes for the trigger button. */
  className?: string;
}

export function Select({ label, value, options, onChange, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target) === true || buttonRef.current?.contains(target) === true) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      // Capture phase: swallow this Escape so the surrounding palette stays open.
      event.stopPropagation();
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const current = options.find((option) => option.value === value);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect !== undefined) {
      setPosition({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width });
    }
    setOpen((currentOpen) => !currentOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`select${className === undefined ? "" : ` ${className}`}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
      >
        <span className="select__value">{current?.label ?? value}</span>
        <span className="select__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div
          ref={listRef}
          className="select__list"
          role="listbox"
          aria-label={label}
          style={{ top: position.top, left: position.left, minWidth: position.minWidth }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="select__option"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
