/**
 * @title Git diff view
 * @notice Center tab showing one commit: a bar with the message, hash, author,
 * and date, then the patch file by file — status badge, path, +/- counts, a
 * single line-number gutter, and tinted rows for additions and removals.
 * @dev The patch text is parsed once per commit into plain rows, so rendering
 * needs no diff library and no measurement pass. Each file header is a
 * disclosure control: its chevron collapses that file's rows through the shared
 * `Collapse` primitive, so minimizing animates exactly like the sidebars.
 */
import { useEffect, useState } from "react";
import { parseDiff } from "../../../git/diff";
import type { DiffFileStatus, DiffLineKind } from "../../../git/diff";
import { gitCommitDetail } from "../../../git/git";
import type { GitCommitDetail } from "../../../git/git";
import { calendarDate, relativeTime } from "../../../git/present";
import type { TerminalSession } from "../../../terminal/sessions";
import { Collapse } from "../../animation/collapse/Collapse";
import { Chevron } from "../../ui/chevron/Chevron";
import "./GitDiffView.css";

/** Badge text and color class per change kind. */
const STATUS_LABEL: Record<DiffFileStatus, string> = {
  added: "added",
  deleted: "deleted",
  renamed: "renamed",
  modified: "modified",
};

/** Leading sign shown in the gutter of each row. */
const LINE_SIGN: Record<DiffLineKind, string> = {
  hunk: "",
  add: "+",
  remove: "-",
  context: " ",
  note: "",
};

export interface GitDiffViewProps {
  /** The diff tab. `path` holds the repo root, `commit` the hash. */
  session: TerminalSession;
  /** Whether this tab is the visible one. */
  active: boolean;
}

export function GitDiffView({ session, active }: GitDiffViewProps) {
  const root = session.path ?? "";
  const commit = session.commit ?? "";
  const [detail, setDetail] = useState<GitCommitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const toggleFile = (key: string) => {
    setCollapsed((current) =>
      current.includes(key)
        ? current.filter((candidate) => candidate !== key)
        : [...current, key],
    );
  };

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    gitCommitDetail(root, commit)
      .then((next) => {
        if (!cancelled) {
          setDetail(next);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [root, commit]);

  const files = detail === null ? [] : parseDiff(detail.diff);

  const copyHash = () => {
    void navigator.clipboard
      .writeText(commit)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => undefined);
  };

  return (
    <div className="git-diff" data-active={active} aria-hidden={!active}>
      <div className="git-diff__bar">
        <span className="git-diff__title" title={detail?.subject ?? commit}>
          {detail?.subject ?? commit.slice(0, 7)}
        </span>
        <span className="git-diff__meta">
          <span className="git-diff__hash">{detail?.short ?? commit.slice(0, 7)}</span>
          {detail !== null && (
            <>
              <span>{detail.authorName}</span>
              <span>{calendarDate(detail.authoredAt)}</span>
              <span>{relativeTime(detail.authoredAt)}</span>
            </>
          )}
        </span>
        <button
          type="button"
          className="git-diff__copy"
          disabled={detail === null}
          onClick={copyHash}
        >
          {copied ? "Copied" : "Copy hash"}
        </button>
      </div>

      {error !== null ? (
        <div className="git-diff__state">
          <p className="git-diff__state-title">Could not read this commit</p>
          <p className="git-diff__state-text">{error}</p>
        </div>
      ) : detail === null ? (
        <p className="git-diff__loading">Reading commit…</p>
      ) : files.length === 0 ? (
        <div className="git-diff__state">
          <p className="git-diff__state-title">No changes to show</p>
          <p className="git-diff__state-text">
            This commit records no patch — typical for a merge commit.
          </p>
        </div>
      ) : (
        <div className="git-diff__body">
          {files.map((file, index) => {
            const key = `${file.path}-${index}`;
            const isCollapsed = collapsed.includes(key);
            return (
              <section key={key} className="git-diff__file">
                <button
                  type="button"
                  className="git-diff__file-head"
                  aria-expanded={!isCollapsed}
                  title={isCollapsed ? `Expand ${file.path}` : `Collapse ${file.path}`}
                  onClick={() => toggleFile(key)}
                >
                  <Chevron open={!isCollapsed} />
                  <span className={`git-diff__status git-diff__status--${file.status}`}>
                    {STATUS_LABEL[file.status]}
                  </span>
                  <span className="git-diff__file-path" title={file.path}>
                    {file.path}
                  </span>
                  <span className="git-diff__counts">
                    <span className="git-diff__count git-diff__count--add">
                      +{file.additions}
                    </span>
                    <span className="git-diff__count git-diff__count--remove">
                      −{file.deletions}
                    </span>
                  </span>
                </button>
                <Collapse open={!isCollapsed} orientation="vertical">
                  <div className="git-diff__lines">
                    {file.lines.map((line, position) => (
                      <div
                        key={position}
                        className={`git-diff__line git-diff__line--${line.kind}`}
                      >
                        <span className="git-diff__number">
                          {line.newNumber ?? line.oldNumber ?? ""}
                        </span>
                        <span className="git-diff__sign">{LINE_SIGN[line.kind]}</span>
                        <span className="git-diff__text">{line.text}</span>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
