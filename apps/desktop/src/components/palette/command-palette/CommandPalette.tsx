/**
 * @title Command palette
 * @notice Picker for quick actions: search, the project and global command
 * lists, and the form that creates new ones.
 * @dev A row types its command into the active terminal session, so it behaves
 * like typing it at the prompt. Chrome comes from `PaletteShell`; only the
 * search field forwards arrows and Enter, so the form inputs keep their own
 * keyboard handling.
 */
import { useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Lightning } from "@phosphor-icons/react";
import {
  addCommand,
  removeCommand,
  useGlobalCommands,
  useProjectCommands,
} from "../../../commands/commands";
import type { CommandScope, SavedCommand } from "../../../commands/commands";
import { runSavedCommand } from "../../../commands/run";
import { closePalette } from "../../../palette/palette";
import { useActiveTerminalId } from "../../../terminal/sessions";
import { useWorkspace } from "../../../workspace/workspace";
import { CommandRow } from "../../command/command-row/CommandRow";
import { Select } from "../../ui/select/Select";
import { PaletteShell } from "../palette-shell/PaletteShell";
import "./CommandPalette.css";

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [command, setCommand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<CommandScope>("project");
  const projectCommands = useProjectCommands();
  const globalCommands = useGlobalCommands();
  const canRun = useActiveTerminalId() !== "";
  const { root } = useWorkspace();

  const needle = query.trim().toLowerCase();
  const matches = (entry: SavedCommand) =>
    needle.length === 0 ||
    entry.label.toLowerCase().includes(needle) ||
    entry.command.toLowerCase().includes(needle);
  const visibleProject = projectCommands.filter(matches);
  const visibleGlobal = globalCommands.filter(matches);
  const items = [...visibleProject, ...visibleGlobal];
  const activeIndex = Math.min(selected, Math.max(items.length - 1, 0));

  const run = (entry: SavedCommand) => {
    if (runSavedCommand(entry.command)) {
      closePalette();
      return;
    }
    setError("Could not reach the terminal — open one with + first.");
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) {
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setSelected((activeIndex + step + items.length) % items.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const entry = items[activeIndex];
      if (entry !== undefined) {
        run(entry);
      }
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedCommand = command.trim();
    if (trimmedLabel === "" || trimmedCommand === "") {
      return;
    }
    addCommand(trimmedLabel, trimmedCommand, root === null ? "global" : scope);
    setLabel("");
    setCommand("");
    setFormOpen(false);
  };

  return (
    <PaletteShell
      label="Commands"
      placeholder="Search commands"
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setSelected(0);
      }}
      onClose={closePalette}
      onSearchKeyDown={onSearchKeyDown}
      onAdd={() => setFormOpen((current) => !current)}
      addExpanded={formOpen}
      addLabel="New command"
    >
      {formOpen && (
        <form className="command-palette__form" onSubmit={submit}>
          <div className="command-palette__row">
            <input
              className="command-palette__input"
              placeholder="Label"
              aria-label="Command label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <Select
              label="Command scope"
              value={scope}
              onChange={(value) => setScope(value as CommandScope)}
              options={[
                { value: "project", label: "Project" },
                { value: "global", label: "Global" },
              ]}
            />
          </div>
          <input
            className="command-palette__input"
            placeholder="Command"
            aria-label="Shell command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
          />
          <button
            type="submit"
            className="command-palette__submit"
            disabled={label.trim() === "" || command.trim() === ""}
          >
            Add command
          </button>
        </form>
      )}

      {error !== null && <p className="palette-shell__empty">{error}</p>}

      {items.length === 0 && !formOpen && (
        <p className="palette-shell__empty">No commands yet — press + to add one.</p>
      )}

      {visibleProject.length > 0 && (
        <section className="palette-shell__section">
          <h2 className="palette-shell__heading">
            Quick action
            <span className="palette-shell__divider" aria-hidden="true" />
          </h2>
          {visibleProject.map((entry, index) => (
            <CommandRow
              key={entry.id}
              icon={<Lightning size={16} />}
              label={entry.label}
              active={index === activeIndex}
              onSelect={() => run(entry)}
              onRemove={() => removeCommand(entry.id)}
            />
          ))}
        </section>
      )}

      {visibleGlobal.length > 0 && (
        <section className="palette-shell__section">
          <h2 className="palette-shell__heading">
            Global
            <span className="palette-shell__divider" aria-hidden="true" />
          </h2>
          {visibleGlobal.map((entry, index) => (
            <CommandRow
              key={entry.id}
              icon={<Lightning size={16} />}
              label={entry.label}
              active={visibleProject.length + index === activeIndex}
              onSelect={() => run(entry)}
              onRemove={() => removeCommand(entry.id)}
            />
          ))}
        </section>
      )}

      {items.length > 0 && !canRun && (
        <p className="palette-shell__empty">Open a terminal to run commands.</p>
      )}
    </PaletteShell>
  );
}
