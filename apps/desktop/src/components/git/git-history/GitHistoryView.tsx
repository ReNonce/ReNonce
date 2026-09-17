/**
 * @title Git history view
 * @notice Files-panel view that replaces the file tree: the folder's commits,
 * newest first, grouped by day — avatar, author, message, short hash, relative
 * time, and ref badges. Clicking a row opens that commit's diff as a center tab.
 * @dev Reads through the backend git commands, so it needs the desktop shell —
 * outside it the view says so instead of looking like an empty repository. The
 * header sticks to the top of the panel so refresh and branch stay reachable
 * while the list scrolls.
 */
import { useEffect, useState } from "react";
import { gitBranches, gitCheckout, gitLog, gitRepoInfo } from "../../../git/git";
import type { GitBranch, GitCommit, GitRepoInfo } from "../../../git/git";
import { calendarDate, dayKey, relativeTime } from "../../../git/present";
import { openCommitDiffTab } from "../../../terminal/sessions";
import { MaskIcon } from "../../icons/mask-icon/MaskIcon";
import { BranchPicker } from "../branch-picker/BranchPicker";
import { CommitAvatar } from "../commit-avatar/CommitAvatar";
import "./GitHistoryView.css";

export interface GitHistoryViewProps {
  /** Repository root — the folder currently open in the workspace. */
  root: string;
}

interface CommitGroup {
  key: string;
  label: string;
  rows: GitCommit[];
}

/** Buckets commits by their author date, preserving newest-first order. */
function groupByDay(commits: GitCommit[]): CommitGroup[] {
  const groups: CommitGroup[] = [];
  for (const commit of commits) {
    const key = dayKey(commit.authoredAt);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.key === key) {
      last.rows.push(commit);
    } else {
      groups.push({ key, label: calendarDate(commit.authoredAt), rows: [commit] });
    }
  }
  return groups;
}

/** Badge color class: the current checkout, a tag, or a plain branch. */
function refClass(ref: string): string {
  if (ref.includes("HEAD")) {
    return "git-history__badge--head";
  }
  if (ref.startsWith("tag:")) {
    return "git-history__badge--tag";
  }
  return "git-history__badge--branch";
}

export function GitHistoryView({ root }: GitHistoryViewProps) {
  const [repo, setRepo] = useState<GitRepoInfo | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([gitRepoInfo(root), gitLog(root), gitBranches(root).catch(() => [])])
      .then(([info, rows, branchRows]) => {
        if (cancelled) {
          return;
        }
        setRepo(info);
        setCommits(rows);
        setBranches(branchRows);
        setError(null);
        setCheckoutError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setRepo(null);
        setCommits([]);
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

  const groups = groupByDay(commits);

  const switchBranch = async (name: string) => {
    setCheckoutError(null);
    setSwitching(true);
    try {
      await gitCheckout(root, name);
      setReloadToken((value) => value + 1);
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="git-history">
      <div className="git-history__bar">
        {repo !== null && (
          <BranchPicker
            branches={branches}
            current={repo.branch}
            busy={switching}
            onSelect={(name) => void switchBranch(name)}
          />
        )}
        <span className="git-history__count">
          {commits.length === 1 ? "1 commit" : `${commits.length} commits`}
        </span>
        <button
          type="button"
          className="git-history__refresh"
          title="Refresh history"
          aria-label="Refresh history"
          onClick={() => setReloadToken((value) => value + 1)}
        >
          <MaskIcon src="/assets/icons/refresh_title.svg" size={14} />
        </button>
      </div>

      {checkoutError !== null && <p className="git-history__notice">{checkoutError}</p>}

      {error !== null ? (
        <div className="git-history__state">
          <p className="git-history__state-title">No git history here</p>
          <p className="git-history__state-text">{error}</p>
        </div>
      ) : loading && commits.length === 0 ? (
        <p className="git-history__loading">Reading history…</p>
      ) : commits.length === 0 ? (
        <div className="git-history__state">
          <p className="git-history__state-title">No commits yet</p>
          <p className="git-history__state-text">
            This repository has no commits on the current branch.
          </p>
        </div>
      ) : (
        <div className="git-history__list">
          {groups.map((group) => (
            <section key={group.key} className="git-history__group">
              <h2 className="git-history__day">
                Commits on {group.label}
                <span className="git-history__divider" aria-hidden="true" />
              </h2>
              {group.rows.map((commit) => (
                <button
                  key={commit.hash}
                  type="button"
                  className="git-history__row"
                  title={`${commit.short} ${commit.subject}`}
                  onClick={() => openCommitDiffTab(root, commit.hash)}
                >
                  <CommitAvatar
                    name={commit.authorName}
                    email={commit.authorEmail}
                    size={24}
                  />
                  <span className="git-history__body">
                    <span className="git-history__subject">{commit.subject}</span>
                    <span className="git-history__meta">
                      <span className="git-history__author">{commit.authorName}</span>
                      <span className="git-history__hash">{commit.short}</span>
                      <span className="git-history__time">
                        {relativeTime(commit.authoredAt)}
                      </span>
                      {commit.parents > 1 && (
                        <span className="git-history__badge git-history__badge--merge">
                          merge
                        </span>
                      )}
                      {commit.refs.map((ref) => (
                        <span key={ref} className={`git-history__badge ${refClass(ref)}`}>
                          {ref}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
