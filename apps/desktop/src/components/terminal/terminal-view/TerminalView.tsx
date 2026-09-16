/**
 * @title Terminal view
 * @notice Center panel: every tab of the strip stays mounted and only the active
 * one is visible — terminals as xterm surfaces, files as editor views. With no
 * tab open it shows the welcome block.
 * @dev Terminal surfaces keep their PTY and xterm instance, and editors keep
 * their buffer, so switching tabs is instant and nothing restarts.
 * @return The center tab container element.
 */
import { useActiveTabId, useTerminalSessions } from "../../../terminal/sessions";
import { WelcomeScreen } from "../../welcome/welcome-screen/WelcomeScreen";
import { EditorView } from "../../editor/editor-view/EditorView";
import { TerminalSurface } from "../terminal-surface/TerminalSurface";
import "./TerminalView.css";

export function TerminalView() {
  const sessions = useTerminalSessions();
  const activeId = useActiveTabId();

  if (sessions.length === 0) {
    return (
      <div className="terminal-view">
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="terminal-view">
      {sessions.map((session) =>
        session.path === null ? (
          <TerminalSurface key={session.id} session={session} active={session.id === activeId} />
        ) : (
          <EditorView key={session.id} session={session} active={session.id === activeId} />
        ),
      )}
    </div>
  );
}
