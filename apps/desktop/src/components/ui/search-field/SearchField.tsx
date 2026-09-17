/**
 * @title Search field
 * @notice Panel search row: a bordered field with the magnifier, a placeholder,
 * and the current key binding inside it on the right.
 * @dev Presentational — the hosting panel owns the query and the results. The
 * hint is read from the keymap store by action id, so rebinding updates it
 * everywhere the field is used.
 */
import { useKeymap } from "../../../keymap/keymap";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import "./SearchField.css";

export interface SearchFieldProps {
  /** Current query text. */
  value: string;
  /** Called with the new query text. */
  onChange: (value: string) => void;
  /** Placeholder and accessible name, e.g. "Search files". */
  label: string;
  /** Keymap action id whose binding is shown inside the field. */
  binding?: string;
  /** Renders the field disabled (nothing to search yet). */
  disabled?: boolean;
}

export function SearchField({
  value,
  onChange,
  label,
  binding,
  disabled = false,
}: SearchFieldProps) {
  const bindings = useKeymap();
  const shortcut = binding === undefined ? undefined : bindings[binding];

  return (
    <div className="search-field">
      <div className="search-field__frame" data-disabled={disabled}>
        <span className="search-field__icon" aria-hidden="true">
          <MaskIcon src="/assets/icons/magnifying_glass.svg" />
        </span>
        <input
          type="search"
          className="search-field__input"
          placeholder={label}
          aria-label={label}
          title={disabled ? "Open a folder to search" : undefined}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {shortcut !== undefined && shortcut !== "" && (
          <span className="search-field__shortcut" title={`Bound to ${shortcut}`}>
            {shortcut}
          </span>
        )}
      </div>
    </div>
  );
}
