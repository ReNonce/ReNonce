/**
 * @title Agent usage bar
 * @notice Bottom strip of the Agent panel with one universal button: clicking it
 * opens a list of every agent and the usage limit the user actually has for it.
 * @dev Nothing is listed until asked for — a catalog of dozens would drown the
 * panel — and each agent is read separately, so providers that cannot be read
 * (their limits only exist inside their own TUI) say so instead of showing a
 * guess. Numbers refresh when the list opens, on a slow interval while it is up,
 * and by hand.
 */
import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { AGENT_CLIS } from "../../../agent/agents";
import { USAGE_AGENT_KEYS, readAgentUsage, untilReset, usageLevel, usageNote } from "../../../agent/usage";
import type { AgentUsage } from "../../../agent/usage";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { PaletteShell } from "../../palette/palette-shell/PaletteShell";
import "./AgentUsageBar.css";

/** How often the open list re-reads usage. */
const REFRESH_MS = 60_000;

/** Agents worth listing: the ones with a readable source. */
const USAGE_AGENTS = AGENT_CLIS.filter((agent) => USAGE_AGENT_KEYS.includes(agent.key));

export interface AgentUsageBarProps {
  /**
   * Session the user picked, if any: its agent and folder decide which run the
   * per-session providers (Grok) summarise.
   */
  focus?: { agentKey: string; cwd: string | null } | null;
}

export function AgentUsageBar({ focus = null }: AgentUsageBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [usage, setUsage] = useState<Record<string, AgentUsage | null>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    void Promise.all(
      USAGE_AGENTS.map((agent) =>
        readAgentUsage(agent.key, focus?.cwd ?? null)
          .then((entry) => [agent.key, entry] as const)
          .catch(() => [agent.key, null] as const),
      ),
    ).then((entries) => {
      setUsage(Object.fromEntries(entries));
      setLoaded(true);
    });
  }, [focus?.cwd]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLoaded(false);
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [open, load]);

  const needle = query.trim().toLowerCase();
  const visible =
    needle === ""
      ? USAGE_AGENTS
      : USAGE_AGENTS.filter(
          (agent) =>
            agent.label.toLowerCase().includes(needle) ||
            agent.key.includes(needle) ||
            agent.command.includes(needle),
        );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visible.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
  };

  return (
    <div className="agent-usage">
      <button
        type="button"
        className="agent-usage__button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Show usage limits"
        onClick={() => setOpen(true)}
      >
        <MaskIcon src="/assets/icons/signal_high.svg" size={14} />
        Usage
      </button>

      {open && (
        <PaletteShell
          label="Agent usage limits"
          placeholder="Search agents"
          query={query}
          onQueryChange={setQuery}
          onSearchKeyDown={onSearchKeyDown}
          onClose={close}
        >
          <section className="palette-shell__section">
            <h2 className="palette-shell__heading">
              Usage limits
              <span className="palette-shell__divider" aria-hidden="true" />
            </h2>

            {visible.map((agent, index) => {
              const entry = usage[agent.key] ?? null;
              return (
                <div
                  key={agent.key}
                  className="agent-usage__row"
                  data-active={index === activeIndex}
                >
                  <span className="agent-usage__row-icon" aria-hidden="true">
                    <MaskIcon src={agent.iconSrc} />
                  </span>
                  <span className="agent-usage__name">{agent.label}</span>

                  {entry === null || entry === undefined ? (
                    <span
                      className="agent-usage__none"
                      title={loaded ? usageNote(agent.key) : undefined}
                    >
                      {loaded ? "not readable" : "checking…"}
                    </span>
                  ) : (
                    <span className="agent-usage__windows">
                      {entry.detail !== null && (
                        <span
                          className="agent-usage__window"
                          data-level="low"
                          title={entry.detail}
                        >
                          {entry.detail}
                        </span>
                      )}
                      {entry.windows.map((window) => (
                        <span
                          key={window.label}
                          className="agent-usage__window"
                          data-level={usageLevel(window.usedPercent)}
                          title={`${window.usedPercent}% used — resets in ${untilReset(window.resetsAt)}`}
                        >
                          <span className="agent-usage__label">{window.label}</span>
                          <span className="agent-usage__value">
                            {Math.round(window.usedPercent)}%
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}

            {visible.length === 0 && (
              <p className="agent-usage__empty">No agent matches.</p>
            )}
          </section>
        </PaletteShell>
      )}
    </div>
  );
}
