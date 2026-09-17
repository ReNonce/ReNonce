//! @title Agent usage
//! @notice Rolling usage limits of the agent CLIs, read from what they already
//! leave on disk.
//! @dev Each provider is asked the way that provider actually exposes data, so a
//! provider is a small reader over a known location instead of a network call:
//! nothing here talks to a vendor API or burns quota. Codex is the one that
//! writes machine-readable plan windows (`rate_limits` with a 5-hour and a
//! weekly window) into its rollout logs; agents that only report usage inside
//! their TUI are simply absent, and the panel says so rather than inventing
//! numbers.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

/// One rolling limit window of a provider.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageWindow {
    /// Human label derived from the window length, e.g. `5h` or `7d`.
    pub label: String,
    /// Share of the window already used, 0..=100.
    pub used_percent: f64,
    /// Window length in minutes.
    pub window_minutes: u64,
    /// Unix timestamp when the window resets.
    pub resets_at: i64,
}

/// Usage of one agent CLI.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentUsage {
    /// Agent key from the frontend catalog, e.g. `codex`.
    pub agent_key: String,
    /// Where the numbers came from, shown as the chip's tooltip.
    pub source: String,
    /// Rolling windows, as the provider reports them.
    pub windows: Vec<UsageWindow>,
    /// One-line note for providers that report totals rather than windows
    /// (Grok answers with a session's token and cost summary).
    pub detail: Option<String>,
    /// Unix timestamp of the reading.
    pub read_at: i64,
}

/// How many of the newest logs are inspected before giving up.
const MAX_LOGS: usize = 40;

/// Recursion depth: `sessions/YYYY/MM/DD/file.jsonl`.
const LOG_DEPTH: usize = 4;

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs() as i64)
        .unwrap_or(0)
}

/// The user's home directory, where the CLIs keep their state.
fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

/// Files under `dir` that can hold usage data, newest first.
fn recent_files(dir: &Path, depth: usize) -> Vec<(SystemTime, PathBuf)> {
    let mut found = Vec::new();
    collect_files(dir, depth, &mut found);
    found.sort_by(|left, right| right.0.cmp(&left.0));
    found
}

fn collect_files(dir: &Path, depth: usize, found: &mut Vec<(SystemTime, PathBuf)>) {
    if depth == 0 {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(kind) = entry.file_type() else {
            continue;
        };
        if kind.is_dir() {
            collect_files(&path, depth - 1, found);
            continue;
        }
        if path.extension().and_then(|value| value.to_str()) != Some("jsonl") {
            continue;
        }
        let modified = entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .unwrap_or(UNIX_EPOCH);
        found.push((modified, path));
    }
}

/// Largest prefix of `text` that is one balanced JSON object.
fn balanced_object(text: &str) -> Option<&str> {
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;
    for (index, character) in text.char_indices() {
        if in_string {
            if escaped {
                escaped = false;
            } else if character == '\\' {
                escaped = true;
            } else if character == '"' {
                in_string = false;
            }
            continue;
        }
        match character {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                if depth == 0 {
                    return None;
                }
                depth -= 1;
                if depth == 0 {
                    return text.get(..index + 1);
                }
            }
            _ => {}
        }
    }
    None
}

/// Window label: `5h` for 300 minutes, `7d` for a weekly window.
fn window_label(minutes: u64) -> String {
    if minutes >= 1440 && minutes % 1440 == 0 {
        return format!("{}d", minutes / 1440);
    }
    if minutes >= 60 && minutes % 60 == 0 {
        return format!("{}h", minutes / 60);
    }
    format!("{minutes}m")
}

/// Turns a `{ primary, secondary }` rate-limit object into usage windows.
fn windows_from(value: &serde_json::Value) -> Vec<UsageWindow> {
    let mut windows = Vec::new();
    for key in ["primary", "secondary"] {
        let Some(window) = value.get(key) else {
            continue;
        };
        let minutes = window
            .get("window_minutes")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0);
        let Some(percent) = window
            .get("used_percent")
            .and_then(serde_json::Value::as_f64)
        else {
            continue;
        };
        windows.push(UsageWindow {
            label: window_label(minutes),
            used_percent: percent,
            window_minutes: minutes,
            resets_at: window
                .get("resets_at")
                .and_then(serde_json::Value::as_i64)
                .unwrap_or(0),
        });
    }
    windows
}

/// Reads the last `rate_limits` object a Codex rollout logged.
fn codex_usage() -> Option<AgentUsage> {
    let home = home_dir()?;
    let dir = home.join(".codex").join("sessions");
    let mut files = recent_files(&dir, LOG_DEPTH);
    files.truncate(MAX_LOGS);

    for (_, path) in files {
        let Ok(text) = fs::read_to_string(&path) else {
            continue;
        };
        let marker = "\"rate_limits\":";
        let Some(index) = text.rfind(marker) else {
            continue;
        };
        let Some(raw) = balanced_object(text.get(index + marker.len()..)?) else {
            continue;
        };
        let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) else {
            continue;
        };
        let windows = windows_from(&value);
        if windows.is_empty() {
            continue;
        }
        return Some(AgentUsage {
            agent_key: "codex".to_string(),
            source: path.display().to_string(),
            windows,
            detail: None,
            read_at: now(),
        });
    }
    None
}

/// Reads the plan limits Claude Code only hands to a statusline command.
/// @dev The mirror file is written by the opt-in wrapper in
/// `desktop/scripts/claude-usage-mirror.sh`, which forwards the same JSON to the
/// statusline that was configured before, so nothing about the user's setup is
/// lost. Without the wrapper the file is absent and this returns None.
fn claude_usage() -> Option<AgentUsage> {
    let home = home_dir()?;
    let mirror = home.join(".claude").join("renonce-usage.json");
    let text = fs::read_to_string(&mirror).ok()?;
    let value: serde_json::Value = serde_json::from_str(&text).ok()?;
    let limits = value.get("rate_limits")?;

    // Keys as Claude Code names them, with the label each one deserves. The
    // spend-limit window only exists for accounts behind a gateway, so it is
    // listed when present and skipped otherwise.
    let mut windows = Vec::new();
    for (key, label) in [
        ("five_hour", "5h"),
        ("seven_day", "7d"),
        ("seven_day_opus", "7d opus"),
        ("seven_day_sonnet", "7d sonnet"),
        ("spend_limit", "spend"),
    ] {
        let Some(entry) = limits.get(key) else {
            continue;
        };
        let percent = entry
            .get("used_percentage")
            .or_else(|| entry.get("used_percent"))
            .and_then(serde_json::Value::as_f64);
        let Some(percent) = percent else {
            continue;
        };
        windows.push(UsageWindow {
            label: label.to_string(),
            used_percent: percent,
            window_minutes: entry
                .get("window_minutes")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(0),
            resets_at: entry
                .get("resets_at")
                .and_then(serde_json::Value::as_i64)
                .unwrap_or(0),
        });
    }

    if windows.is_empty() {
        return None;
    }
    Some(AgentUsage {
        agent_key: "claude".to_string(),
        source: mirror.display().to_string(),
        windows,
        detail: None,
        read_at: now(),
    })
}

/// Newest Grok session folder, preferring ones recorded for `cwd`.
/// @dev Grok keys sessions by folder in its own metadata (`info.cwd` in
/// `summary.json`), so the chosen agent session decides which run is summarised.
fn grok_session_dir(cwd: Option<&str>) -> Option<PathBuf> {
    let home = home_dir()?;
    let root = home.join(".grok").join("sessions");
    let mut found: Vec<(SystemTime, PathBuf, Option<String>)> = Vec::new();
    let Ok(folders) = fs::read_dir(&root) else {
        return None;
    };

    for folder in folders.flatten() {
        let Ok(kind) = folder.file_type() else {
            continue;
        };
        if !kind.is_dir() {
            continue;
        }
        let Ok(sessions) = fs::read_dir(folder.path()) else {
            continue;
        };
        for session in sessions.flatten() {
            let path = session.path();
            if !path.is_dir() {
                continue;
            }
            let modified = session
                .metadata()
                .and_then(|metadata| metadata.modified())
                .unwrap_or(UNIX_EPOCH);
            let recorded = fs::read_to_string(path.join("summary.json"))
                .ok()
                .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
                .and_then(|value| value.get("info")?.get("cwd")?.as_str().map(str::to_string));
            found.push((modified, path, recorded));
        }
    }

    found.sort_by(|left, right| right.0.cmp(&left.0));
    if let Some(needle) = cwd {
        if let Some((_, path, _)) = found
            .iter()
            .find(|(_, _, recorded)| recorded.as_deref() == Some(needle))
        {
            return Some(path.clone());
        }
    }
    found.into_iter().next().map(|(_, path, _)| path)
}

/// Token counts with one decimal, the way dashboards read them.
fn compact(value: u64) -> String {
    if value >= 1_000_000 {
        return format!("{:.1}M", value as f64 / 1_000_000.0);
    }
    if value >= 1_000 {
        return format!("{:.1}k", value as f64 / 1_000.0);
    }
    value.to_string()
}

/// Summarises a `grok usage <session>` payload.
/// @dev The command answers with a JSON document
/// (`{"session":{"totalTokens":…,"turnCount":…,"primaryModelId":…}}`); anything
/// that is not that shape is left to the caller's fallback.
fn grok_detail(text: &str) -> Option<String> {
    let start = text.find('{')?;
    let raw = balanced_object(text.get(start..)?)?;
    let value: serde_json::Value = serde_json::from_str(raw).ok()?;
    let session = value.get("session")?;

    let mut parts = Vec::new();
    if let Some(total) = session
        .get("totalTokens")
        .and_then(serde_json::Value::as_u64)
    {
        parts.push(format!("{} tokens", compact(total)));
    }
    if let Some(turns) = session.get("turnCount").and_then(serde_json::Value::as_u64) {
        parts.push(if turns == 1 {
            "1 turn".to_string()
        } else {
            format!("{turns} turns")
        });
    }
    if let Some(model) = session
        .get("primaryModelId")
        .and_then(serde_json::Value::as_str)
    {
        parts.push(model.to_string());
    }
    if parts.is_empty() {
        return None;
    }
    Some(parts.join(" · "))
}

/// Reads a Grok session's usage through the CLI's own `usage` subcommand.
/// @dev Grok reports per session rather than per account, so the summary belongs
/// to the run the user picked. While a session has nothing recorded, the command
/// fails and this returns None instead of an invented number.
fn grok_usage(cwd: Option<String>) -> Option<AgentUsage> {
    let dir = grok_session_dir(cwd.as_deref())?;
    let session = dir.file_name()?.to_str()?.to_string();
    let output = Command::new("grok")
        .args(["usage", &session])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    // The documented shape is JSON; keep the raw text as a fallback so a format
    // change still shows something rather than nothing.
    let detail = grok_detail(&text).or_else(|| {
        let joined = text
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join(" · ");
        if joined.is_empty() {
            None
        } else {
            Some(joined)
        }
    })?;
    Some(AgentUsage {
        agent_key: "grok".to_string(),
        source: dir.display().to_string(),
        windows: Vec::new(),
        detail: Some(detail.chars().take(200).collect()),
        read_at: now(),
    })
}

/// @notice Reads the usage limits of one agent CLI.
/// @dev Asked per agent, because a catalog of dozens would only ever have a few
/// readable providers — the panel reveals the numbers for the agent the user
/// picked instead of listing every agent all the time. Providers whose limits
/// only exist inside their TUI answer `None`, which the panel states plainly
/// rather than guessing.
/// @param agent_key Agent key from the frontend catalog, e.g. `codex`.
/// @param cwd Folder of the picked session, used by per-session providers.
/// @return The provider's usage, or None when nothing can be read.
#[tauri::command]
pub fn agent_usage(agent_key: String, cwd: Option<String>) -> Option<AgentUsage> {
    match agent_key.as_str() {
        "codex" => codex_usage(),
        "claude" => claude_usage(),
        "grok" => grok_usage(cwd),
        _ => None,
    }
}
