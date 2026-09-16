/**
 * @title Keymap settings
 * @notice Keymap section: record a shortcut per action (switching the workspace
 * between Files and Agent), clear it, or reset everything to the defaults.
 * @dev Recording captures the next keydown on the window in the capture phase
 * and stops it from reaching the global shortcut listener; Escape cancels and
 * modifier-only presses are ignored.
 */
import { useEffect, useState } from "react";
import {
  KEYMAP_ACTIONS,
  eventToBinding,
  resetBindings,
  setBinding,
  useKeymap,
} from "../../../keymap/keymap";
import "./KeymapSettings.css";

export function KeymapSettings() {
  const bindings = useKeymap();
  const [recording, setRecording] = useState<string | null>(null);

  useEffect(() => {
    if (recording === null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        setRecording(null);
        return;
      }
      const binding = eventToBinding(event);
      if (binding === null) {
        return;
      }
      setBinding(recording, binding);
      setRecording(null);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording]);

  return (
    <div className="keymap-settings">
      <section className="keymap-settings__group">
        <h2 className="keymap-settings__title">Shortcuts</h2>
        <ul className="keymap-settings__list">
          {KEYMAP_ACTIONS.map((action) => {
            const binding = bindings[action.id];
            const isRecording = recording === action.id;
            return (
              <li key={action.id} className="keymap-settings__row">
                <span className="keymap-settings__label">{action.label}</span>
                <button
                  type="button"
                  className="keymap-settings__binding"
                  aria-label={`Record shortcut for ${action.label}`}
                  aria-pressed={isRecording}
                  onClick={() =>
                    setRecording((current) => (current === action.id ? null : action.id))
                  }
                >
                  {isRecording ? "Press keys…" : binding === "" ? "Not set" : binding}
                </button>
                <button
                  type="button"
                  className="keymap-settings__clear"
                  aria-label={`Clear shortcut for ${action.label}`}
                  disabled={binding === ""}
                  onClick={() => setBinding(action.id, "")}
                >
                  Clear
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="keymap-settings__reset" onClick={resetBindings}>
          Reset to defaults
        </button>
      </section>
    </div>
  );
}
