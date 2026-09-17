//! @title Git history
//! @notice Read-only git queries behind the history and diff views.
//! @dev Shells out to the `git` binary instead of linking a library: the
//! commands are read-only, the output formats are stable, and it keeps the
//! binary small. Every call runs with `-C <root>`, so the process working
//! directory never changes and commands stay parallel-safe.

use std::process::Command;

use serde::Serialize;

/// One row of the history list.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    /// Full commit hash.
    pub hash: String,
    /// Abbreviated hash.
    pub short: String,
    /// First line of the message.
    pub subject: String,
    pub author_name: String,
    pub author_email: String,
    /// Author date in ISO-8601 (strict), as git reports it.
    pub authored_at: String,
    /// Decorations such as `HEAD -> main` or `tag: v0.1.0`, trimmed.
    pub refs: Vec<String>,
    /// Parent count; more than one means a merge commit.
    pub parents: usize,
}

/// Header plus patch of a single commit.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitDetail {
    pub hash: String,
    pub short: String,
    pub subject: String,
    /// Everything after the subject line, trimmed.
    pub body: String,
    pub author_name: String,
    pub author_email: String,
    pub authored_at: String,
    /// Unified diff text, without the commit header or diffstat.
    pub diff: String,
}

/// Repository facts for the history header.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRepoInfo {
    /// Current branch, or `HEAD` when the branch is unborn or detached.
    pub branch: String,
    /// `origin` URL when one is configured.
    pub remote_url: Option<String>,
}

/// One local branch, for the history header's branch picker.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranch {
    pub name: String,
    /// Whether this is the checked-out branch.
    pub current: bool,
    /// Subject of the branch tip.
    pub subject: String,
    /// Committer date of the branch tip, ISO-8601 strict.
    pub committed_at: String,
    /// Upstream name such as `origin/main`, when configured.
    pub upstream: Option<String>,
}

/// One entry of the working tree status.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitChange {
    /// Path relative to the repository root.
    pub path: String,
    /// Index (staged) status letter, e.g. `M`, `A`, `?`.
    pub index_status: String,
    /// Work tree status letter.
    pub worktree_status: String,
    /// Whether the change is staged and would go into the next commit.
    pub staged: bool,
}

/// Field separator: cannot occur in a commit subject or author name.
const FIELD: char = '\u{1f}';

/// One line per commit, fields split by `FIELD`, subject last so an empty
/// subject still yields the expected field count.
const LOG_FORMAT: &str = "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%P%x1f%D%x1f%s";

/// Largest patch handed to the UI, keeping a runaway commit from freezing it.
const MAX_DIFF_BYTES: usize = 400_000;

/// Runs git in `root` and returns stdout, mapping failures to the stderr text.
fn run(root: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .map_err(|cause| format!("Could not run git: {cause}"))?;
    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if message.is_empty() {
            "git exited with an error".to_string()
        } else {
            message
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Rejects a remote or branch name git would read as a flag.
fn checked(name: &str) -> Result<(), String> {
    if name.is_empty() || name.starts_with('-') {
        return Err("Invalid name".to_string());
    }
    Ok(())
}

/// Everything from the first `diff --git` marker, dropping the commit header.
fn patch_only(output: &str) -> String {
    match output.find("diff --git ") {
        Some(index) => output[index..].to_string(),
        None => String::new(),
    }
}

/// Caps a patch and notes the cut so the reader knows the diff is incomplete.
fn capped(patch: String) -> String {
    if patch.len() <= MAX_DIFF_BYTES {
        return patch;
    }
    let cut = patch[..MAX_DIFF_BYTES]
        .rfind('\n')
        .unwrap_or(MAX_DIFF_BYTES);
    format!("{}\n… diff truncated by ReNonce\n", &patch[..cut])
}

/// Parses `LOG_FORMAT` output into commit rows.
fn parse_log(output: &str) -> Vec<GitCommit> {
    output
        .lines()
        .filter(|line| !line.is_empty())
        .filter_map(|line| {
            let mut fields = line.split(FIELD);
            let hash = fields.next()?.to_string();
            let short = fields.next()?.to_string();
            let author_name = fields.next()?.to_string();
            let author_email = fields.next()?.to_string();
            let authored_at = fields.next()?.to_string();
            let parents = fields.next()?.split_whitespace().count();
            let refs = fields
                .next()?
                .split(',')
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
                .collect();
            let subject = fields.next().unwrap_or_default().to_string();
            Some(GitCommit {
                hash,
                short,
                subject,
                author_name,
                author_email,
                authored_at,
                refs,
                parents,
            })
        })
        .collect()
}

/// @notice Lists commits, newest first.
/// @param root Any directory inside the repository.
/// @param limit Maximum number of commits (clamped to 1..=500).
/// @return Commit rows.
#[tauri::command]
pub fn git_log(root: String, limit: usize) -> Result<Vec<GitCommit>, String> {
    let max_count = format!("--max-count={}", limit.clamp(1, 500));
    let output = run(&root, &["log", &max_count, LOG_FORMAT, "--no-color"])?;
    Ok(parse_log(&output))
}

/// @notice Lists commits that are not on the upstream branch yet.
/// @dev Errors when no upstream is configured; git's message is shown as is.
/// @param root Any directory inside the repository.
/// @return Unpushed commits, newest first.
#[tauri::command]
pub fn git_unpushed(root: String) -> Result<Vec<GitCommit>, String> {
    let output = run(
        &root,
        &["log", "@{upstream}..HEAD", LOG_FORMAT, "--no-color"],
    )?;
    Ok(parse_log(&output))
}

/// @notice Reads the working tree status.
/// @dev Porcelain v1 with NUL separators: paths keep their spaces, and a rename
/// or copy carries its source path as the next record, which is dropped here.
/// @param root Any directory inside the repository.
/// @return One row per changed path.
#[tauri::command]
pub fn git_status(root: String) -> Result<Vec<GitChange>, String> {
    let output = run(
        &root,
        &["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    )?;
    let mut changes = Vec::new();
    let mut records = output.split('\0');
    while let Some(record) = records.next() {
        if record.len() < 4 {
            continue;
        }
        let index_status = record[0..1].to_string();
        let worktree_status = record[1..2].to_string();
        if index_status == "R" || index_status == "C" {
            records.next();
        }
        changes.push(GitChange {
            staged: index_status != " " && index_status != "?",
            path: record[3..].to_string(),
            index_status,
            worktree_status,
        });
    }
    Ok(changes)
}

/// @notice Stages one path.
/// @param root Any directory inside the repository.
/// @param path Path relative to the repository root.
#[tauri::command]
pub fn git_stage(root: String, path: String) -> Result<(), String> {
    run(&root, &["add", "--", &path])?;
    Ok(())
}

/// @notice Unstages one path, leaving the working tree as it is.
/// @param root Any directory inside the repository.
/// @param path Path relative to the repository root.
#[tauri::command]
pub fn git_unstage(root: String, path: String) -> Result<(), String> {
    run(&root, &["restore", "--staged", "--", &path])?;
    Ok(())
}

/// @notice Commits what is staged, with the modifiers the panel offers.
/// @dev `amend` folds the staged changes into the previous commit; an empty
/// message then keeps that commit's message. `signoff` adds a trailer, and
/// `no_verify` skips the repository's hooks.
/// @param root Any directory inside the repository.
/// @param message Commit message; required unless amending.
/// @param amend Amend the last commit instead of adding a new one.
/// @param signoff Append a `Signed-off-by` trailer.
/// @param no_verify Bypass pre-commit and commit-msg hooks.
#[tauri::command]
pub fn git_commit(
    root: String,
    message: String,
    amend: bool,
    signoff: bool,
    no_verify: bool,
) -> Result<(), String> {
    let trimmed = message.trim();
    if trimmed.is_empty() && !amend {
        return Err("A commit message is required".to_string());
    }
    let mut args: Vec<String> = vec!["commit".to_string(), "--quiet".to_string()];
    if amend {
        args.push("--amend".to_string());
    }
    if signoff {
        args.push("--signoff".to_string());
    }
    if no_verify {
        args.push("--no-verify".to_string());
    }
    if trimmed.is_empty() {
        args.push("--no-edit".to_string());
    } else {
        args.push("-m".to_string());
        args.push(trimmed.to_string());
    }
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    run(&root, &refs)?;
    Ok(())
}

/// @notice Lists the configured remotes.
/// @param root Any directory inside the repository.
/// @return Remote names, e.g. `["origin"]`.
#[tauri::command]
pub fn git_remotes(root: String) -> Result<Vec<String>, String> {
    let output = run(&root, &["remote"])?;
    Ok(output
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect())
}

/// @notice Fetches from a remote, or from every remote when none is named.
/// @param root Any directory inside the repository.
/// @param remote Remote to fetch from; `None` fetches the default set.
#[tauri::command]
pub fn git_fetch(root: String, remote: Option<String>) -> Result<(), String> {
    match remote {
        Some(name) => {
            checked(&name)?;
            run(&root, &["fetch", &name])?;
        }
        None => {
            run(&root, &["fetch"])?;
        }
    }
    Ok(())
}

/// @notice Pulls the current branch from its upstream.
/// @param root Any directory inside the repository.
/// @param rebase Rebase local commits instead of creating a merge commit.
#[tauri::command]
pub fn git_pull(root: String, rebase: bool) -> Result<(), String> {
    if rebase {
        run(&root, &["pull", "--rebase"])?;
    } else {
        run(&root, &["pull"])?;
    }
    Ok(())
}

/// @notice Pushes one branch to a named remote.
/// @param root Any directory inside the repository.
/// @param remote Remote to push to.
/// @param branch Branch to push.
#[tauri::command]
pub fn git_push_to(root: String, remote: String, branch: String) -> Result<(), String> {
    checked(&remote)?;
    checked(&branch)?;
    run(&root, &["push", &remote, &branch])?;
    Ok(())
}

/// @notice Force-pushes the current branch, refusing to clobber unseen work.
/// @dev Uses `--force-with-lease`, never a bare `--force`: git rejects the push
/// when the remote moved since the last fetch.
/// @param root Any directory inside the repository.
#[tauri::command]
pub fn git_force_push(root: String) -> Result<(), String> {
    run(&root, &["push", "--force-with-lease"])?;
    Ok(())
}

/// @notice Pushes the checked-out branch to its upstream.
/// @dev Reaches the network through git; git's own failure text is returned.
/// @param root Any directory inside the repository.
#[tauri::command]
pub fn git_push(root: String) -> Result<(), String> {
    run(&root, &["push"])?;
    Ok(())
}

/// @notice Describes the repository at `root`.
/// @param root Any directory inside the repository.
/// @return Branch and origin URL; errors when `root` is not a work tree.
#[tauri::command]
pub fn git_repo_info(root: String) -> Result<GitRepoInfo, String> {
    run(&root, &["rev-parse", "--is-inside-work-tree"])?;
    let branch = run(&root, &["rev-parse", "--abbrev-ref", "HEAD"])
        .or_else(|_| run(&root, &["symbolic-ref", "--short", "HEAD"]))
        .unwrap_or_else(|_| "HEAD".to_string())
        .trim()
        .to_string();
    let remote_url = run(&root, &["config", "--get", "remote.origin.url"])
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    Ok(GitRepoInfo { branch, remote_url })
}

/// @notice Lists local branches, newest tip first.
/// @param root Any directory inside the repository.
/// @return Branch rows; the checked-out branch is flagged.
#[tauri::command]
pub fn git_branches(root: String) -> Result<Vec<GitBranch>, String> {
    let format = format!(
        "--format=%(refname:short){0}%(HEAD){0}%(contents:subject){0}%(committerdate:iso-strict){0}%(upstream:short)",
        FIELD
    );
    let output = run(
        &root,
        &[
            "for-each-ref",
            "--sort=-committerdate",
            &format,
            "refs/heads",
        ],
    )?;
    let branches = output
        .lines()
        .filter(|line| !line.is_empty())
        .filter_map(|line| {
            let mut fields = line.split(FIELD);
            let name = fields.next()?.to_string();
            let current = fields.next()?.trim() == "*";
            let subject = fields.next()?.to_string();
            let committed_at = fields.next()?.to_string();
            let upstream = fields.next().unwrap_or_default().trim().to_string();
            Some(GitBranch {
                name,
                current,
                subject,
                committed_at,
                upstream: if upstream.is_empty() {
                    None
                } else {
                    Some(upstream)
                },
            })
        })
        .collect();
    Ok(branches)
}

/// @notice Switches the working tree to another local branch.
/// @dev Failures (dirty tree, unknown branch) come back as git's own message.
/// @param root Any directory inside the repository.
/// @param branch Local branch name to check out.
#[tauri::command]
pub fn git_checkout(root: String, branch: String) -> Result<(), String> {
    checked(&branch)?;
    run(&root, &["checkout", "--quiet", &branch])?;
    Ok(())
}

/// @notice Reads one commit: its header and its unified diff.
/// @param root Any directory inside the repository.
/// @param hash Commit hash to show.
/// @return Commit header plus patch; the patch is empty for merges.
#[tauri::command]
pub fn git_commit_detail(root: String, hash: String) -> Result<GitCommitDetail, String> {
    let meta_format = format!("--pretty=format:%H{0}%h{0}%an{0}%ae{0}%aI{0}%s{0}%b", FIELD);
    let meta = run(
        &root,
        &["show", "--no-patch", "--no-color", &meta_format, &hash],
    )?;
    let mut fields = meta.split(FIELD);
    let full = fields.next().unwrap_or_default().to_string();
    let short = fields.next().unwrap_or_default().to_string();
    let author_name = fields.next().unwrap_or_default().to_string();
    let author_email = fields.next().unwrap_or_default().to_string();
    let authored_at = fields.next().unwrap_or_default().to_string();
    let subject = fields.next().unwrap_or_default().to_string();
    let body = fields.next().unwrap_or_default().trim().to_string();

    let patch = run(
        &root,
        &["show", "--patch", "--no-color", "--pretty=format:", &hash],
    )?;

    Ok(GitCommitDetail {
        hash: full,
        short,
        subject,
        body,
        author_name,
        author_email,
        authored_at,
        diff: capped(patch_only(&patch)),
    })
}
