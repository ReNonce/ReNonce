/**
 * @title Usage credentials
 * @notice Settings section for the agents whose limits live behind a web session:
 * paste the cookie once and the usage button can read them.
 * @dev Only the agents that need it are listed. Values stay on this machine and
 * are only sent to the provider they belong to; clearing a field removes them.
 */
import { AGENT_CLIS } from "../../../agent/agents";
import { setAgentCredential, useAgentCredentials } from "../../../agent/credentials";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import "./UsageSettings.css";

/** Agents whose usage is read from a web session rather than a local file. */
const CREDENTIAL_AGENTS = ["minimax", "opencode"];

export function UsageSettings() {
  const credentials = useAgentCredentials();
  const agents = AGENT_CLIS.filter((agent) => CREDENTIAL_AGENTS.includes(agent.key));

  return (
    <div className="usage-settings">
      <h2 className="usage-settings__title">Usage credentials</h2>
      <p className="usage-settings__note">
        Some agents publish their limits to their website, not to their CLI. Paste the
        session cookie for those and the Usage list can read them. Values stay on this
        machine and are only sent to that provider.
      </p>

      {agents.map((agent) => (
        <label key={agent.key} className="usage-settings__row">
          <span className="usage-settings__label">
            <MaskIcon src={agent.iconSrc} size={16} />
            {agent.label}
          </span>
          <input
            type="password"
            className="usage-settings__input"
            placeholder="Cookie or token"
            aria-label={`${agent.label} credential`}
            spellCheck={false}
            value={credentials[agent.key] ?? ""}
            onChange={(event) => setAgentCredential(agent.key, event.target.value)}
          />
        </label>
      ))}

      {agents.length === 0 && (
        <p className="usage-settings__note">No agent needs a credential.</p>
      )}
    </div>
  );
}
