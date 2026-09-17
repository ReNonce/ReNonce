/**
 * @title Git data
 * @notice Typed wrappers over the backend git commands behind the history and
 * diff views.
 * @dev Read-only — nothing here writes to the repository. Commands shell out to
 * the `git` binary, so a missing or broken install surfaces as a plain error
 * message in the view instead of a crash.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";

/** One row of the history list. */
export interface GitCommit {
  hash: string;
  short: string;
  subject: string;
  authorName: string;
  authorEmail: string;
  /** ISO-8601 author date. */
  authoredAt: string;
  /** Decorations such as `HEAD -> main` or `tag: v0.1.0`. */
  refs: string[];
  /** Parent count; more than one means a merge commit. */
  parents: number;
}

/** Repository facts for the history header. */
export interface GitRepoInfo {
  branch: string;
  remoteUrl: string | null;
}

/** One local branch, for the history header's branch picker. */
export interface GitBranch {
  name: string;
  /** Whether this is the checked-out branch. */
  current: boolean;
  /** Subject of the branch tip. */
  subject: string;
  /** ISO-8601 committer date of the branch tip. */
  committedAt: string;
  /** Upstream name such as `origin/main`, when configured. */
  upstream: string | null;
}

/** One entry of the working tree status. */
export interface GitChange {
  /** Path relative to the repository root. */
  path: string;
  /** Index (staged) status letter, e.g. `M`, `A`, `?`. */
  indexStatus: string;
  /** Work tree status letter. */
  worktreeStatus: string;
  /** Whether the change is staged and would go into the next commit. */
  staged: boolean;
}

/** Header plus patch of a single commit. */
export interface GitCommitDetail {
  hash: string;
  short: string;
  subject: string;
  body: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  /** Unified diff text; empty for merges without a recorded diff. */
  diff: string;
}

const NOT_DESKTOP = "Git history is only available in the desktop app.";

/**
 * @notice Lists commits of the repository containing `root`, newest first.
 * @param root Any directory inside the repository.
 * @param limit Maximum number of commits (the backend clamps to 1..=500).
 * @return Commit rows, or an empty list outside the desktop app.
 */
export async function gitLog(root: string, limit = 100): Promise<GitCommit[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<GitCommit[]>("git_log", { root, limit });
}

/**
 * @notice Reads the branch and origin URL of the repository containing `root`.
 * @param root Any directory inside the repository.
 * @return Repository info; rejects when `root` is not a work tree.
 */
export async function gitRepoInfo(root: string): Promise<GitRepoInfo> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  return invoke<GitRepoInfo>("git_repo_info", { root });
}

/**
 * @notice Lists the repository's local branches, newest tip first.
 * @param root Any directory inside the repository.
 * @return Branch rows, or an empty list outside the desktop app.
 */
export async function gitBranches(root: string): Promise<GitBranch[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<GitBranch[]>("git_branches", { root });
}

/**
 * @notice Checks out another local branch.
 * @dev The only command here that writes to the repository; git's own message
 * (for example a dirty working tree) is what the caller shows on failure.
 * @param root Any directory inside the repository.
 * @param branch Local branch name to check out.
 */
export async function gitCheckout(root: string, branch: string): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_checkout", { root, branch });
}

/**
 * @notice Reads the working tree status.
 * @param root Any directory inside the repository.
 * @return One row per changed path.
 */
export async function gitStatus(root: string): Promise<GitChange[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<GitChange[]>("git_status", { root });
}

/**
 * @notice Lists commits that are not on the upstream branch yet.
 * @dev Rejects when no upstream is configured; the caller decides what to show.
 * @param root Any directory inside the repository.
 * @return Unpushed commits, newest first.
 */
export async function gitUnpushed(root: string): Promise<GitCommit[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<GitCommit[]>("git_unpushed", { root });
}

/**
 * @notice Stages one path.
 * @param root Any directory inside the repository.
 * @param path Path relative to the repository root.
 */
export async function gitStage(root: string, path: string): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_stage", { root, path });
}

/**
 * @notice Unstages one path, leaving the working tree as it is.
 * @param root Any directory inside the repository.
 * @param path Path relative to the repository root.
 */
export async function gitUnstage(root: string, path: string): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_unstage", { root, path });
}

/**
 * @notice Commits what is staged, with the modifiers the panel offers.
 * @param root Any directory inside the repository.
 * @param message Commit message; may be empty when amending.
 * @param options Amend, sign-off, and hook-skipping flags.
 */
export async function gitCommit(
  root: string,
  message: string,
  options: { amend?: boolean; signoff?: boolean; noVerify?: boolean } = {},
): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_commit", {
    root,
    message,
    amend: options.amend === true,
    signoff: options.signoff === true,
    noVerify: options.noVerify === true,
  });
}

/**
 * @notice Lists the configured remotes.
 * @param root Any directory inside the repository.
 * @return Remote names.
 */
export async function gitRemotes(root: string): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<string[]>("git_remotes", { root });
}

/**
 * @notice Fetches from a remote, or from the default set when none is named.
 * @param root Any directory inside the repository.
 * @param remote Remote to fetch from.
 */
export async function gitFetch(root: string, remote?: string): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_fetch", { root, remote: remote ?? null });
}

/**
 * @notice Pulls the current branch from its upstream.
 * @param root Any directory inside the repository.
 * @param rebase Rebase local commits instead of merging.
 */
export async function gitPull(root: string, rebase: boolean): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_pull", { root, rebase });
}

/**
 * @notice Pushes one branch to a named remote.
 * @param root Any directory inside the repository.
 * @param remote Remote to push to.
 * @param branch Branch to push.
 */
export async function gitPushTo(
  root: string,
  remote: string,
  branch: string,
): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_push_to", { root, remote, branch });
}

/**
 * @notice Force-pushes the current branch with `--force-with-lease`.
 * @param root Any directory inside the repository.
 */
export async function gitForcePush(root: string): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_force_push", { root });
}

/**
 * @notice Pushes the checked-out branch to its upstream.
 * @dev Network call through git; failures carry git's own message.
 * @param root Any directory inside the repository.
 */
export async function gitPush(root: string): Promise<void> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  await invoke("git_push", { root });
}

/**
 * @notice Reads one commit: header plus unified diff.
 * @param root Any directory inside the repository.
 * @param hash Commit hash to read.
 * @return The commit detail.
 */
export async function gitCommitDetail(root: string, hash: string): Promise<GitCommitDetail> {
  if (!isTauri()) {
    throw new Error(NOT_DESKTOP);
  }
  return invoke<GitCommitDetail>("git_commit_detail", { root, hash });
}
