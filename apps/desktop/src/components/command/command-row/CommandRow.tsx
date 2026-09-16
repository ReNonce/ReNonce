/**
 * @title Command row
 * @notice One "icon + label + hint" row, shared by the welcome card and the
 * palette sections so both read the same.
 * @dev Renders a plain button, or a button plus a remove control when
 * `onRemove` is given (the two cannot nest, so the remove sits beside it).
 */
import type { ReactNode } from "react";
import "./CommandRow.css";

export interface CommandRowProps {
  /** Row glyph, usually a `<MaskIcon />` or a Phosphor icon. */
  icon: ReactNode;
  /** Row label. */
  label: string;
  /** Right-aligned hint: a key binding, a command, or any note. */
  hint?: string;
  /** Highlights the row (palette keyboard selection). */
  active?: boolean;
  /** Called when the row is chosen. */
  onSelect: () => void;
  /** Adds a remove control when provided. */
  onRemove?: () => void;
}

/**
 * @notice Renders a command row.
 * @param props.icon Row glyph.
 * @param props.label Row label.
 * @param props.hint Right-aligned hint.
 * @param props.active Whether the row is keyboard-selected.
 * @param props.onSelect Called when the row is chosen.
 * @param props.onRemove Called when the remove control is used.
 * @return The row element.
 */
export function CommandRow({
  icon,
  label,
  hint,
  active = false,
  onSelect,
  onRemove,
}: CommandRowProps) {
  const row = (
    <button type="button" className="command-row" data-active={active} onClick={onSelect}>
      <span className="command-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="command-row__label">{label}</span>
      {hint !== undefined && hint !== "" && <span className="command-row__hint">{hint}</span>}
    </button>
  );

  if (onRemove === undefined) {
    return row;
  }

  return (
    <div className="command-row__item">
      {row}
      <button
        type="button"
        className="command-row__remove"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}
