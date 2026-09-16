/**
 * @title File search
 * @notice Search field for the Files panel: magnifier icon, placeholder, and the
 * current key binding inside the field on its right.
 * @dev Presentational — FileExplorer owns the query and the results. The
 * shortcut text comes from the keymap store, so rebinding updates the hint.
 */
import { useKeymap } from "../../../keymap/keymap";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import "./FileSearch.css";

export interface FileSearchProps {
  /** Current query text. */
  value: string;
  /** Called with the new query text. */
  onChange: (value: string) => void;
  /** Renders the field disabled (no folder open yet). */
  disabled?: boolean;
}

/**
 * @notice Renders the search row.
 * @param props.value Current query.
 * @param props.onChange Called with the new query.
 * @param props.disabled Whether the field is inert (nothing to search yet).
 * @return The search row element.
 */
export function FileSearch({ value, onChange, disabled = false }: FileSearchProps) {
  const bindings = useKeymap();
  const shortcut = bindings["file.search"];

  return (
    <div className="file-search">
      <div className="file-search__field" data-disabled={disabled}>
        <span className="file-search__icon" aria-hidden="true">
          <MaskIcon src="/assets/icons/magnifying_glass.svg" />
        </span>
        <input
          type="search"
          className="file-search__input"
          placeholder="Search files"
          aria-label="Search files"
          title={disabled ? "Open a folder to search" : undefined}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {shortcut !== undefined && shortcut !== "" && (
          <span className="file-search__shortcut" title={`Bound to ${shortcut}`}>
            {shortcut}
          </span>
        )}
      </div>
    </div>
  );
}
