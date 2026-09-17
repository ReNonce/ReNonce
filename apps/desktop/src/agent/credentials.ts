/**
 * @title Agent credentials
 * @notice Session cookies and tokens that some usage providers need, keyed by
 * agent.
 * @dev Minimax and opencode publish limits to their websites instead of their
 * CLIs, so reading them takes a session the user already has. Values are kept in
 * localStorage on this machine only, are never logged, and are only ever sent to
 * the provider they belong to.
 */
import { useSyncExternalStore } from "react";

export type AgentCredentials = Record<string, string>;

const STORAGE_KEY = "renonce.agentCredentials";

function read(): AgentCredentials {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

let credentials: AgentCredentials = read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @notice Subscribes React to the credential map.
 * @return Credentials keyed by agent.
 */
export function useAgentCredentials(): AgentCredentials {
  return useSyncExternalStore(subscribe, () => credentials);
}

/**
 * @notice Reads one agent's credential without subscribing.
 * @param key Agent key, e.g. `minimax`.
 * @return The stored value, or an empty string.
 */
export function getAgentCredential(key: string): string {
  return credentials[key] ?? "";
}

/**
 * @notice Stores or clears an agent's credential.
 * @dev A blank value removes the entry, so a wrong cookie can be cleared as
 * easily as it was added.
 * @param key Agent key.
 * @param value Cookie header or token.
 */
export function setAgentCredential(key: string, value: string): void {
  const trimmed = value.trim();
  const next = { ...credentials };
  if (trimmed === "") {
    delete next[key];
  } else {
    next[key] = trimmed;
  }
  credentials = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } catch {
    // Storage can be unavailable — the value still works for this session.
  }
  notify();
}
