/**
 * @title Window controls
 * @notice Minimize / maximize-restore / close buttons for the borderless window.
 * @dev Drives the Tauri window API; the buttons are disabled outside the
 * desktop shell (plain `npm run dev` in a browser). Requires the window
 * permissions declared in `src-tauri/capabilities/default.json`
 * (allow-minimize, allow-toggle-maximize, allow-close, allow-is-maximized;
 * the top bar drag region additionally uses allow-start-dragging). The
 * maximize button swaps to a restore glyph while the window is maximized.
 */
import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./WindowControls.css";

function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 15h.5c.8 0 1.5-.7 1.5-1.5v-8c0-.8-.7-1.5-1.5-1.5h-8C11.7 4 11 4.7 11 5.5V6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * @notice Renders the three window buttons.
 * @return The window controls element.
 */
export function WindowControls() {
  const available = isTauri();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }
    const appWindow = getCurrentWindow();
    const syncMaximized = () => {
      void appWindow.isMaximized().then(setMaximized);
    };
    syncMaximized();
    let unlisten: (() => void) | undefined;
    void appWindow.onResized(syncMaximized).then((stop) => {
      unlisten = stop;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const handleMinimize = () => {
    void getCurrentWindow().minimize();
  };

  const handleToggleMaximize = () => {
    void getCurrentWindow().toggleMaximize();
  };

  const handleClose = () => {
    void getCurrentWindow().close();
  };

  const maximizeLabel = maximized ? "Restore" : "Maximize";

  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-controls__button"
        onClick={handleMinimize}
        disabled={!available}
        aria-label="Minimize window"
        title="Minimize"
      >
        <MinimizeIcon />
      </button>
      <button
        type="button"
        className="window-controls__button"
        onClick={handleToggleMaximize}
        disabled={!available}
        aria-label={`${maximizeLabel} window`}
        title={maximizeLabel}
      >
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button
        type="button"
        className="window-controls__button window-controls__button--close"
        onClick={handleClose}
        disabled={!available}
        aria-label="Close window"
        title="Close"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
