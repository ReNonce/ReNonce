/**
 * @title Palette overlay
 * @notice Key binding palette (Ctrl+K, or the welcome row): search plus the
 * icon + label + hint rows shared with the rest of the app.
 * @dev Arrow keys move the selection, Enter runs it, Escape or a click outside
 * closes, and typing filters labels. All chrome comes from `PaletteShell`, which
 * the command picker reuses too.
 */
import { useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { runKeymapAction } from "../../../keymap/actions";
import { KEYMAP_ACTIONS, useKeymap } from "../../../keymap/keymap";
import { closePalette } from "../../../palette/palette";
import { CommandRow } from "../../command/command-row/CommandRow";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { PaletteShell } from "../palette-shell/PaletteShell";

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  iconSrc: string;
  run: () => void;
}

export function PaletteOverlay() {
  const bindings = useKeymap();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const items = useMemo<PaletteItem[]>(
    () =>
      KEYMAP_ACTIONS.map((action) => ({
        id: action.id,
        label: action.label,
        hint: bindings[action.id] ?? "",
        iconSrc: action.iconSrc,
        run: () => {
          runKeymapAction(action.id);
        },
      })),
    [bindings],
  );

  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (item) => needle.length === 0 || item.label.toLowerCase().includes(needle),
  );
  const activeIndex = Math.min(selected, Math.max(visible.length - 1, 0));

  const runItem = (item: PaletteItem | undefined) => {
    if (item === undefined) {
      return;
    }
    closePalette();
    item.run();
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (visible.length === 0) {
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setSelected((activeIndex + step + visible.length) % visible.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runItem(visible[activeIndex]);
    }
  };

  return (
    <PaletteShell
      label="Key bindings"
      placeholder="Search bindings"
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setSelected(0);
      }}
      onClose={closePalette}
      onSearchKeyDown={onSearchKeyDown}
    >
      <section className="palette-shell__section">
        <h2 className="palette-shell__heading">
          Key bindings
          <span className="palette-shell__divider" aria-hidden="true" />
        </h2>
        {visible.map((item, index) => (
          <CommandRow
            key={item.id}
            icon={<MaskIcon src={item.iconSrc} />}
            label={item.label}
            hint={item.hint}
            active={index === activeIndex}
            onSelect={() => runItem(item)}
          />
        ))}
      </section>
    </PaletteShell>
  );
}
