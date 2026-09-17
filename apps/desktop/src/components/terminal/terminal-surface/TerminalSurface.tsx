/**
 * @title Terminal surface
 * @notice One xterm.js surface bound to one PTY session; the center panel keeps
 * every session mounted and shows only the active one.
 * @dev Inactive surfaces stay in the layout with `visibility: hidden` rather
 * than `display: none`, because a display-none element has no metrics — xterm
 * measures its cell size when it opens and would compute zero cells. Each
 * surface owns its own PTY, so switching tabs is instant and shells keep
 * running in the background. Outside the desktop shell it shows a note.
 */
import { useEffect, useRef, useState } from "react";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { TerminalSession } from "../../../terminal/sessions";
import { takeInitialCommand } from "../../../terminal/sessions";
import { notifyAgentExit } from "../../../agent/sessions";
import type { TerminalColors, ThemeColors } from "../../../theme/types";
import { useTheme } from "../../../theme/useTheme";
import "./TerminalSurface.css";

interface PtyEvent {
  kind: "data" | "exit" | "error";
  data?: string;
  message?: string;
}

const FONT_FAMILY = '"Lilex", ui-monospace, SFMono-Regular, Menlo, monospace';

function toXtermTheme(colors: ThemeColors, terminal: TerminalColors) {
  const ansi = terminal.ansi;
  return {
    background: colors.background,
    foreground: colors.foreground,
    cursor: terminal.cursor,
    cursorAccent: terminal.cursorAccent,
    selectionBackground: terminal.selection,
    black: ansi[0],
    red: ansi[1],
    green: ansi[2],
    yellow: ansi[3],
    blue: ansi[4],
    magenta: ansi[5],
    cyan: ansi[6],
    white: ansi[7],
    brightBlack: ansi[8],
    brightRed: ansi[9],
    brightGreen: ansi[10],
    brightYellow: ansi[11],
    brightBlue: ansi[12],
    brightMagenta: ansi[13],
    brightCyan: ansi[14],
    brightWhite: ansi[15],
  };
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export interface TerminalSurfaceProps {
  /** Session this surface renders. */
  session: TerminalSession;
  /** Whether this surface is the visible one. */
  active: boolean;
}

/**
 * @notice Renders one terminal surface.
 * @param props.session Session to bind to.
 * @param props.active Whether the session is the visible tab.
 * @return The surface element.
 */
export function TerminalSurface({ session, active }: TerminalSurfaceProps) {
  const { colors, terminal } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const attemptRef = useRef(0);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    const term = new Terminal({
      fontFamily: FONT_FAMILY,
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      theme: toXtermTheme(colors, terminal),
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();
    // Web fonts load after the first layout; re-fit so the cell metrics (and
    // therefore the row count) match the real mono font instead of a fallback.
    void document.fonts.ready.then(() => {
      try {
        fit.fit();
      } catch {
        // The container can be gone by the time the fonts resolve.
      }
    });
    termRef.current = term;
    fitRef.current = fit;

    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // The container can be zero-sized while a view transition runs.
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  useEffect(() => {
    const term = termRef.current;
    if (term !== null) {
      term.options.theme = toXtermTheme(colors, terminal);
    }
  }, [colors, terminal]);

  useEffect(() => {
    const term = termRef.current;
    if (term === null) {
      return;
    }
    if (!isTauri()) {
      setStatus("Terminal runs in the desktop shell — a browser shows this placeholder.");
      return;
    }
    setStatus(null);

    // The PTY key is the plain session id, so other modules (the command
    // palette's runner) can address the same session. React StrictMode re-runs
    // effects in development; the cleanup below closes on a later tick and skips
    // it when a newer attempt already owns the session, so the first run can
    // never kill the second run's shell.
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    const id = session.id;
    const channel = new Channel<PtyEvent>();
    channel.onmessage = (event) => {
      if (event.kind === "data" && event.data !== undefined) {
        term.write(decodeBase64(event.data));
      } else if (event.kind === "exit") {
        // An agent CLI is the tab's own process, so its exit closes the tab and
        // leaves the session row behind to be resumed. A plain shell keeps the
        // banner it always had.
        if (session.agent) {
          notifyAgentExit(id);
        } else {
          term.write("\r\n\x1b[2m[process exited]\x1b[0m\r\n");
        }
      } else if (event.kind === "error") {
        term.write(`\r\n\x1b[31m[renonce] ${event.message ?? "pty error"}\x1b[0m\r\n`);
      }
    };

    void invoke("pty_open", {
      id,
      cwd: session.cwd,
      shell: session.shell,
      cols: term.cols,
      rows: term.rows,
      onEvent: channel,
    })
      .then(() => {
        // A session can be born with a launcher to run — an agent CLI, for one.
        const command = takeInitialCommand(id);
        if (command !== null) {
          return invoke("pty_write", { id, data: `${command}\n` });
        }
        return undefined;
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        term.write(`\r\n\x1b[31m[renonce] ${message}\x1b[0m\r\n`);
      });

    const dataDisposable = term.onData((data) => {
      void invoke("pty_write", { id, data }).catch(() => {
        // The session can already be gone (tab closed) — drop the keystrokes.
      });
    });
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      void invoke("pty_resize", { id, cols, rows }).catch(() => {
        // Resizes race the session setup, especially on a fresh tab.
      });
    });

    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
      window.setTimeout(() => {
        if (attemptRef.current === attempt) {
          void invoke("pty_close", { id });
        }
      }, 0);
    };
  }, [session.id, session.cwd, session.shell]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const term = termRef.current;
    const fit = fitRef.current;
    if (term === null || fit === null) {
      return;
    }
    try {
      fit.fit();
    } catch {
      // Ignore a zero-sized container; the observer re-fits once it has size.
    }
    term.refresh(0, term.rows - 1);
    term.focus();
  }, [active]);

  return (
    <div className="terminal-surface" data-active={active} aria-hidden={!active}>
      {status !== null && <p className="terminal-surface__status">{status}</p>}
      <div className="terminal-surface__inner" ref={containerRef} />
    </div>
  );
}
