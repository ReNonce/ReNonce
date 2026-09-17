/**
 * @title Git commit view
 * @notice Files-panel view for shipping work: a Commit/Push switch, the changed
 * paths with track (stage) and untrack (unstage) checkboxes, a message field
 * with a commit button, and — in push mode — the commits that are not upstream
 * yet, each one opening its diff in the center.
 * @dev Commits and pushes always target the checked-out branch, so the shared
 * `BranchPicker` in the header is what redirects them. Every action runs through
 * the backend git commands and ends with a refresh, so the lists always mirror
 * the working tree; git's own message is what the notice row shows.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  gitBranches,
  gitCheckout,
  gitCommit,
  gitFetch,
  gitForcePush,
  gitPull,
  gitPush,
  gitPushTo,
  gitRemotes,
  gitRepoInfo,
  gitStage,
  gitStatus,
  gitUnstage,
  gitUnpushed,
} from "../../../git/git";
import type { GitBranch, GitChange, GitCommit, GitRepoInfo } from "../../../git/git";
import { relativeTime } from "../../../git/present";
import { openCommitDiffTab } from "../../../terminal/sessions";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { ViewSwitcher } from "../../layout/view-switcher/ViewSwitcher";
import { ContextMenu } from "../../ui/context-menu/ContextMenu";
import type { ContextMenuItem } from "../../ui/context-menu/ContextMenu";
import { BranchPicker } from "../branch-picker/BranchPicker";
import { CommitAvatar } from "../commit-avatar/CommitAvatar";
import "./GitCommitView.css";

/** Single status letter plus its color class. */
function changeKind(change: GitChange): { letter: string; kind: string } {
  if (change.indexStatus === "?" || change.worktreeStatus === "?") {
    return { letter: "U", kind: "untracked" };
  }
  const letter = change.staged ? change.indexStatus : change.worktreeStatus;
  switch (letter) {
    case "A":
      return { letter: "A", kind: "added" };
    case "D":
      return { letter: "D", kind: "deleted" };
    case "R":
      return { letter: "R", kind: "renamed" };
    default:
      return { letter: "M", kind: "modified" };
  }
}

interface Notice {
  kind: "ok" | "error";
  text: string;
}

/** Commit modifiers, selectable one at a time (or none). */
type CommitModifier = "amend" | "signoff" | "no-verify" | null;

const MODIFIERS: Array<{ key: Exclude<CommitModifier, null>; label: string; title: string }> = [
  {
    key: "amend",
    label: "Amend",
    title: "Fold the staged changes into the last commit",
  },
  {
    key: "signoff",
    label: "Sign off",
    title: "Append a Signed-off-by trailer",
  },
  {
    key: "no-verify",
    label: "Skip hooks",
    title: "Skip pre-commit and commit-msg hooks",
  },
];

export interface GitCommitViewProps {
  /** Repository root — the folder currently open in the workspace. */
  root: string;
}

export function GitCommitView({ root }: GitCommitViewProps) {
  const [mode, setMode] = useState<"commit" | "push">("commit");
  const [repo, setRepo] = useState<GitRepoInfo | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [unpushed, setUnpushed] = useState<GitCommit[]>([]);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [modifier, setModifier] = useState<CommitModifier>(null);
  const [remotes, setRemotes] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [remotePicker, setRemotePicker] = useState<{
    kind: "fetch" | "push-to";
    x: number;
    y: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      gitRepoInfo(root),
      gitBranches(root).catch(() => []),
      gitStatus(root),
      gitUnpushed(root).catch(() => []),
      gitRemotes(root).catch(() => []),
    ])
      .then(([info, branchRows, changeRows, unpushedRows, remoteRows]) => {
        if (cancelled) {
          return;
        }
        setRepo(info);
        setBranches(branchRows);
        setChanges(changeRows);
        setUnpushed(unpushedRows);
        setRemotes(remoteRows);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setRepo(null);
        setBranches([]);
        setChanges([]);
        setUnpushed([]);
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [root, reloadToken]);

  const refresh = () => setReloadToken((value) => value + 1);

  // Auto-grow: the message box follows its content up to a cap, so composing a
  // long message never means typing inside a cramped single line. The manual
  // expand toggle takes over from there for a really long message.
  useLayoutEffect(() => {
    const node = messageRef.current;
    if (node === null) {
      return;
    }
    if (expanded) {
      // Hand sizing back to the stylesheet so the tall mode applies.
      node.style.height = "";
      return;
    }
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 200)}px`;
  }, [message, expanded]);

  /** Runs one git action and reports whatever git answers. */
  const act = async (action: () => Promise<void>, success: string, after?: () => void) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice({ kind: "ok", text: success });
      after?.();
      refresh();
    } catch (cause) {
      setNotice({
        kind: "error",
        text: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleStage = (change: GitChange) =>
    act(
      () => (change.staged ? gitUnstage(root, change.path) : gitStage(root, change.path)),
      change.staged ? `Unstaged ${change.path}` : `Staged ${change.path}`,
    );

  const branch = repo?.branch ?? "";
  const upstream = branches.find((candidate) => candidate.current)?.upstream ?? null;
  const staged = changes.filter((change) => change.staged);
  const amend = modifier === "amend";
  const canCommit = (message.trim().length > 0 || amend) && (staged.length > 0 || amend);

  const commit = () =>
    act(
      () =>
        gitCommit(root, message, {
          amend,
          signoff: modifier === "signoff",
          noVerify: modifier === "no-verify",
        }),
      amend ? `Amended on ${branch}` : `Committed on ${branch}`,
      () => {
        setMessage("");
        setModifier(null);
        setMode("push");
      },
    );

  const push = () => act(() => gitPush(root), "Pushed");

  const switchBranch = (name: string) => act(() => gitCheckout(root, name), `On ${name}`);

  /** Remote list action: `fetch` grabs a remote, `push-to` publishes to one. */
  const useRemote = (kind: "fetch" | "push-to", remote: string) =>
    act(
      () =>
        kind === "fetch"
          ? gitFetch(root, remote)
          : gitPushTo(root, remote, branch),
      kind === "fetch" ? `Fetched ${remote}` : `Pushed ${branch} → ${remote}`,
    );

  /** Where a follow-up menu opens: the same corner as the menu that spawned it. */
  const anchor = { x: menu === null ? 0 : menu.x, y: menu === null ? 0 : menu.y };

  const menuItems: ContextMenuItem[] = [
    { id: "fetch", label: "Fetch", onSelect: () => void act(() => gitFetch(root), "Fetched") },
    {
      id: "fetch-from",
      label: "Fetch From…",
      onSelect: () => setRemotePicker({ kind: "fetch", ...anchor }),
    },
    {
      id: "pull",
      label: "Pull",
      separatorBefore: true,
      onSelect: () => void act(() => gitPull(root, false), "Pulled"),
    },
    {
      id: "pull-rebase",
      label: "Pull (Rebase)",
      onSelect: () => void act(() => gitPull(root, true), "Pulled with rebase"),
    },
    {
      id: "push",
      label: "Push",
      separatorBefore: true,
      onSelect: () => void push(),
    },
    {
      id: "push-to",
      label: "Push To…",
      onSelect: () => setRemotePicker({ kind: "push-to", ...anchor }),
    },
    {
      id: "force-push",
      label: "Force Push",
      onSelect: () => void act(() => gitForcePush(root), "Force pushed (with lease)"),
    },
  ];

  const remoteItems: ContextMenuItem[] =
    remotes.length === 0
      ? [{ id: "none", label: "No remotes configured", disabled: true }]
      : remotes.map((remote) => ({
          id: remote,
          label: remote,
          onSelect: () => {
            if (remotePicker !== null) {
              void useRemote(remotePicker.kind, remote);
            }
          },
        }));

  return (
    <div className="git-commit">
      <div className="git-commit__bar">
        {repo !== null && (
          <BranchPicker
            branches={branches}
            current={branch}
            busy={busy}
            onSelect={(name) => void switchBranch(name)}
          />
        )}
        <span className="git-commit__count">
          {changes.length === 0 ? "Working tree clean" : `${changes.length} changed`}
        </span>
        <button
          type="button"
          className="git-commit__more"
          title="More git actions"
          aria-label="More git actions"
          aria-haspopup="menu"
          disabled={busy}
          onClick={(event) => setMenu({ x: event.clientX, y: event.clientY })}
        >
          <MaskIcon src="/assets/icons/ellipsis.svg" size={16} />
        </button>
        <button
          type="button"
          className="git-commit__refresh"
          title="Refresh status"
          aria-label="Refresh status"
          onClick={refresh}
        >
          <MaskIcon src="/assets/icons/refresh_title.svg" size={14} />
        </button>
      </div>

      <div className="git-commit__modes">
        <ViewSwitcher
          label="Git mode"
          activeKey={mode}
          items={[
            {
              key: "commit",
              label: staged.length > 0 ? `Commit (${staged.length})` : "Commit",
              icon: <MaskIcon src="/assets/icons/git_commit.svg" size={16} />,
            },
            {
              key: "push",
              label: unpushed.length > 0 ? `Push (${unpushed.length})` : "Push",
              icon: <MaskIcon src="/assets/icons/arrow_up.svg" size={16} />,
            },
          ]}
          onSelect={(key) => {
            if (key === "commit" || key === "push") {
              setMode(key);
            }
          }}
        />
      </div>

      {notice !== null && (
        <p className={`git-commit__notice git-commit__notice--${notice.kind}`}>
          {notice.text}
        </p>
      )}

      {error !== null ? (
        <div className="git-commit__state">
          <p className="git-commit__state-title">No git repository here</p>
          <p className="git-commit__state-text">{error}</p>
        </div>
      ) : loading && changes.length === 0 && unpushed.length === 0 ? (
        <p className="git-commit__loading">Reading status…</p>
      ) : mode === "commit" ? (
        <>
          <div className="git-commit__list">
            {changes.length === 0 && (
              <p className="git-commit__empty">Nothing changed since the last commit.</p>
            )}
            {changes.map((change) => {
              const { letter, kind } = changeKind(change);
              return (
                <label key={change.path} className="git-commit__file">
                  <input
                    type="checkbox"
                    className="git-commit__checkbox"
                    checked={change.staged}
                    disabled={busy}
                    onChange={() => void toggleStage(change)}
                  />
                  <span className={`git-commit__status git-commit__status--${kind}`}>
                    {letter}
                  </span>
                  <span className="git-commit__path" title={change.path}>
                    {change.path}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="git-commit__compose">
            <div className="git-commit__modifiers" role="group" aria-label="Commit options">
              {MODIFIERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="git-commit__modifier"
                  aria-pressed={modifier === option.key}
                  title={option.title}
                  onClick={() =>
                    setModifier((current) => (current === option.key ? null : option.key))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="git-commit__message-row">
              <textarea
                ref={messageRef}
                className="git-commit__message"
                placeholder="Commit message"
                value={message}
                disabled={busy}
                rows={1}
                data-expanded={expanded}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter" &&
                    canCommit
                  ) {
                    event.preventDefault();
                    void commit();
                  }
                }}
              />
              <button
                type="button"
                className="git-commit__expand"
                aria-pressed={expanded}
                title={expanded ? "Collapse the message box" : "Expand the message box"}
                onClick={() => setExpanded((value) => !value)}
              >
                <MaskIcon src="/assets/icons/expand_vertical.svg" size={14} />
              </button>
            </div>
            <button
              type="button"
              className="git-commit__submit"
              disabled={busy || !canCommit}
              title={branch === "" ? undefined : `Commit to ${branch}`}
              onClick={() => void commit()}
            >
              {amend ? "Amend" : "Commit"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="git-commit__list">
            {unpushed.length === 0 && (
              <p className="git-commit__empty">Everything on this branch is pushed.</p>
            )}
            {unpushed.map((commit) => (
              <button
                key={commit.hash}
                type="button"
                className="git-commit__commit-row"
                title={`${commit.short} ${commit.subject}`}
                onClick={() => openCommitDiffTab(root, commit.hash)}
              >
                <CommitAvatar
                  name={commit.authorName}
                  email={commit.authorEmail}
                  size={22}
                />
                <span className="git-commit__commit-body">
                  <span className="git-commit__commit-subject">{commit.subject}</span>
                  <span className="git-commit__commit-meta">
                    <span className="git-commit__hash">{commit.short}</span>
                    {relativeTime(commit.authoredAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="git-commit__compose">
            <span className="git-commit__target">
              {upstream === null
                ? "No upstream configured"
                : `Push ${branch} → ${upstream}`}
            </span>
            <button
              type="button"
              className="git-commit__submit"
              disabled={busy || unpushed.length === 0}
              onClick={() => void push()}
            >
              Push
            </button>
          </div>
        </>
      )}

      {menu !== null && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}

      {remotePicker !== null && (
        <ContextMenu
          x={remotePicker.x}
          y={remotePicker.y}
          items={remoteItems}
          onClose={() => setRemotePicker(null)}
        />
      )}
    </div>
  );
}
