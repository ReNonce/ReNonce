/**
 * @title Terminal view
 * @notice Center panel: every tab of the strip stays mounted and only the active
 * one is visible — terminals as xterm surfaces, files as editor views, commit
 * diffs as the git diff view. With no tab open it shows the welcome block.
 * @dev Terminal surfaces keep their PTY and xterm instance, and content tabs
 * keep their loaded data, so switching tabs is instant and nothing restarts.
 * @return The center tab container element.
 */
import { useActiveTabId, useTerminalSessions } from "../../../terminal/sessions";
import { WelcomeScreen } from "../../welcome/welcome-screen/WelcomeScreen";
import { EditorView } from "../../editor/editor-view/EditorView";
import { GitDiffView } from "../../git/git-diff/GitDiffView";
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
      {sessions.map((session) => {
        const active = session.id === activeId;
        switch (session.kind) {
          case "diff":
            return <GitDiffView key={session.id} session={session} active={active} />;
          case "editor":
            return <EditorView key={session.id} session={session} active={active} />;
          default:
            return <TerminalSurface key={session.id} session={session} active={active} />;
        }
      })}
    </div>
  );
}
