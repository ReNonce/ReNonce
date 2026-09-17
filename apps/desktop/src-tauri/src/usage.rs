//! @title Agent usage
//! @notice Rolling usage limits of the agent CLIs, read the way each provider
//! actually exposes them.
//! @dev Most providers publish limits locally — Codex writes its 5-hour and
//! weekly windows into its rollout logs — so those readers stay on disk. Grok is
//! the exception: its CLI has no local limit file, so its own billing endpoint is
//! queried with the token the CLI stored, exactly as the CLI does. Nothing here
//! spends quota: only billing and quota reads, never a completion.

use std::fs;
use std::path::{Path, PathBuf};
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
            read_at: now(),
        });
    }
    None
}

/// Claude's stored OAuth token.
/// @dev `CLAUDE_CODE_OAUTH_TOKEN` wins when it is set, which is how the CLI itself
/// can be pointed at a token; otherwise the credentials file Claude Code writes is
/// read. The macOS keychain, which Orca also supports, is not read here.
fn claude_token() -> Option<String> {
    if let Ok(token) = std::env::var("CLAUDE_CODE_OAUTH_TOKEN") {
        if !token.is_empty() {
            return Some(token);
        }
    }
    let home = home_dir()?;
    let text = fs::read_to_string(home.join(".claude").join(".credentials.json")).ok()?;
    let value: serde_json::Value = serde_json::from_str(&text).ok()?;
    value
        .get("claudeAiOauth")?
        .get("accessToken")?
        .as_str()
        .filter(|token| !token.is_empty())
        .map(str::to_string)
}

/// One window of the usage payload, where `resets_at` may be ISO or epoch.
fn claude_window(
    entry: Option<&serde_json::Value>,
    label: &str,
    minutes: u64,
) -> Option<UsageWindow> {
    let entry = entry?;
    let percent = entry
        .get("utilization")
        .and_then(serde_json::Value::as_f64)?;
    let resets_at = match entry.get("resets_at") {
        Some(serde_json::Value::String(text)) => iso_to_epoch(text),
        Some(serde_json::Value::Number(number)) => number.as_i64(),
        _ => None,
    }
    .unwrap_or(0);
    Some(UsageWindow {
        label: label.to_string(),
        used_percent: percent.clamp(0.0, 100.0),
        window_minutes: minutes,
        resets_at,
    })
}

/// Claude's plan windows, from the usage endpoint the CLI's `/usage` calls.
/// @dev Read-only, and the same request the CLI makes: the stored OAuth token with
/// the beta header it expects. A token Claude has since replaced answers 401, which
/// falls back to the statusline mirror.
async fn claude_oauth_usage() -> Option<AgentUsage> {
    let token = claude_token()?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .ok()?;
    let response = client
        .get("https://api.anthropic.com/api/oauth/usage")
        .bearer_auth(&token)
        .header("anthropic-beta", "oauth-2025-04-20")
        .header("User-Agent", "claude-code/2.1.0")
        .send()
        .await
        .ok()?;
    if !response.status().is_success() {
        return None;
    }
    let body: serde_json::Value = response.json().await.ok()?;

    let mut windows = Vec::new();
    for (key, label, minutes) in [
        ("five_hour", "5h", 300_u64),
        ("seven_day", "7d", 10_080),
        ("seven_day_opus", "7d opus", 10_080),
        ("seven_day_sonnet", "7d sonnet", 10_080),
    ] {
        if let Some(window) = claude_window(body.get(key), label, minutes) {
            windows.push(window);
        }
    }
    if windows.is_empty() {
        return None;
    }
    Some(AgentUsage {
        agent_key: "claude".to_string(),
        source: "Anthropic usage API".to_string(),
        windows,
        read_at: now(),
    })
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
        read_at: now(),
    })
}

/// Converts an ISO-8601 timestamp to Unix seconds.
/// @dev Only what the billing APIs send is handled: `YYYY-MM-DDTHH:MM:SS` with
/// optional fractional seconds and either `Z` or a `±HH:MM` offset. Written out
/// instead of pulling in a date crate for one parse.
fn iso_to_epoch(text: &str) -> Option<i64> {
    let bytes = text.as_bytes();
    if bytes.len() < 19 {
        return None;
    }
    let number = |from: usize, to: usize| text.get(from..to)?.parse::<i64>().ok();
    let (year, month, day) = (number(0, 4)?, number(5, 7)?, number(8, 10)?);
    let (hour, minute, second) = (number(11, 13)?, number(14, 16)?, number(17, 19)?);

    // Days since 1970-01-01, by Howard Hinnant's civil-from-days inverse.
    let year = if month <= 2 { year - 1 } else { year };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let year_of_era = year - era * 400;
    let day_of_year = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    let days = era * 146_097 + day_of_era - 719_468;

    let mut seconds = days * 86_400 + hour * 3_600 + minute * 60 + second;
    if let Some(rest) = text.get(19..) {
        if rest.starts_with('+') || rest.starts_with('-') {
            let sign = if rest.starts_with('-') { -1 } else { 1 };
            let offset = rest.get(1..)?;
            let offset_hours = offset.get(0..2)?.parse::<i64>().ok()?;
            let offset_minutes = offset.get(3..5)?.parse::<i64>().ok()?;
            seconds -= sign * (offset_hours * 3_600 + offset_minutes * 60);
        }
    }
    Some(seconds)
}

/// The stored Grok CLI access token, with the account id when the file has one.
fn grok_token(auth: &serde_json::Value) -> Option<(String, Option<String>)> {
    let entries = auth.as_object()?;
    for (name, entry) in entries {
        if !name.starts_with("https://auth.x.ai") {
            continue;
        }
        let Some(token) = entry.get("key").and_then(serde_json::Value::as_str) else {
            continue;
        };
        if token.is_empty() {
            continue;
        }
        let user_id = entry
            .get("user_id")
            .and_then(serde_json::Value::as_str)
            .map(str::to_string);
        return Some((token.to_string(), user_id));
    }
    None
}

/// Usage windows from a Grok billing payload.
/// @dev The credits view reports `creditUsagePercent` with the current period;
/// the default view reports the monthly budget as `monthlyLimit`/`used`. Both are
/// read, and a confirmed weekly period with no percentage counts as 0% — the same
/// reading the Grok CLI's own billing view implies.
fn grok_windows(config: &serde_json::Value) -> Vec<UsageWindow> {
    let period_end = config
        .get("currentPeriod")
        .and_then(|period| period.get("end"))
        .or_else(|| config.get("billingPeriodEnd"))
        .and_then(serde_json::Value::as_str);
    let resets_at = period_end.and_then(iso_to_epoch).unwrap_or(0);
    let period_type = config
        .get("currentPeriod")
        .and_then(|period| period.get("type"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    let window_minutes = if period_type.contains("WEEKLY") {
        10_080
    } else if period_type.contains("MONTHLY") {
        43_200
    } else {
        0
    };

    let mut windows = Vec::new();
    if let Some(percent) = config
        .get("creditUsagePercent")
        .and_then(serde_json::Value::as_f64)
    {
        windows.push(UsageWindow {
            label: window_label(if window_minutes == 0 {
                10_080
            } else {
                window_minutes
            }),
            used_percent: percent,
            window_minutes,
            resets_at,
        });
    } else if window_minutes > 0 {
        windows.push(UsageWindow {
            label: window_label(window_minutes),
            used_percent: 0.0,
            window_minutes,
            resets_at,
        });
    }

    let money = |key: &str| {
        config
            .get(key)
            .and_then(|entry| entry.get("val"))
            .and_then(|value| {
                value
                    .as_f64()
                    .or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
            })
    };
    if let (Some(limit), Some(used)) = (money("monthlyLimit"), money("used")) {
        if limit > 0.0 {
            windows.push(UsageWindow {
                label: "month".to_string(),
                used_percent: (used / limit * 100.0).clamp(0.0, 100.0),
                window_minutes: 43_200,
                resets_at,
            });
        }
    }
    windows
}

/// Grok's account limit, from the billing endpoint its own CLI queries.
/// @dev Read-only: the stored access token goes to Grok's CLI proxy with the
/// header the CLI sets, which is what xAI expects. An expired token simply fails
/// the request and reads as unavailable rather than being refreshed silently.
async fn grok_usage() -> Option<AgentUsage> {
    let home = home_dir()?;
    let auth = fs::read_to_string(home.join(".grok").join("auth.json")).ok()?;
    let auth: serde_json::Value = serde_json::from_str(&auth).ok()?;
    let (token, user_id) = grok_token(&auth)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .ok()?;
    let request = |url: &str| {
        let mut request = client
            .get(url)
            .header("X-XAI-Token-Auth", "xai-grok-cli")
            .header("Accept", "application/json")
            .bearer_auth(&token);
        if let Some(id) = user_id.as_deref() {
            request = request.header("x-userid", id);
        }
        request
    };

    // The credits view carries the rolling period; the plain view carries the
    // monthly budget that some unified-billing accounts report instead.
    let credits = "https://cli-chat-proxy.grok.com/v1/billing?format=credits";
    let mut windows = match fetch_billing(request(credits)).await {
        Some(body) => grok_windows(body.get("config").unwrap_or(&body)),
        None => Vec::new(),
    };
    if windows.is_empty() {
        let plain = "https://cli-chat-proxy.grok.com/v1/billing";
        if let Some(body) = fetch_billing(request(plain)).await {
            windows = grok_windows(body.get("config").unwrap_or(&body));
        }
    }
    if windows.is_empty() {
        return None;
    }

    Some(AgentUsage {
        agent_key: "grok".to_string(),
        source: "Grok billing API".to_string(),
        windows,
        read_at: now(),
    })
}

/// Reads one billing response, or None when the request failed.
async fn fetch_billing(request: reqwest::RequestBuilder) -> Option<serde_json::Value> {
    let response = request.send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    response.json().await.ok()
}

/// Code Assist endpoints: the first resolves the project, the second the quota.
/// @dev Google's token endpoint is deliberately not called: refreshing would need
/// the Gemini CLI's OAuth client credentials, and those belong to the CLI rather
/// than to this repository (a copy here is also what push protection rejects). The
/// CLI refreshes its own token every time it runs, which is enough for reading the
/// quota, and a stale token simply reads as unavailable.
const GEMINI_ASSIST_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const GEMINI_QUOTA_URL: &str = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";

/// Friendly window names for the model buckets Google reports.
fn gemini_bucket_name(model: &str) -> String {
    let known = match model {
        "gemini-3.1-pro" => Some("3.1 Pro"),
        "gemini-3.1-flash" => Some("3.1 Flash"),
        "gemini-3.0-pro" => Some("3.0 Pro"),
        "gemini-3.0-flash" => Some("3.0 Flash"),
        "gemini-2.5-pro" => Some("Pro"),
        "gemini-2.5-flash" => Some("Flash"),
        "gemini-2.5-flash-lite" => Some("Flash Lite"),
        "gemini-2.0-pro" => Some("2.0 Pro"),
        "gemini-2.0-flash" => Some("2.0 Flash"),
        _ => None,
    };
    if let Some(name) = known {
        return name.to_string();
    }
    model
        .trim_start_matches("gemini-")
        .split('-')
        .map(|part| {
            let mut characters = part.chars();
            match characters.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), characters.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// The Gemini CLI's stored access token.
/// @dev Read as-is, whatever its timestamp says: a stale token makes the quota
/// call answer 401, which reads as unavailable, and the CLI refreshes the file the
/// next time it runs. Nothing here writes to the user's credentials.
fn gemini_token() -> Option<String> {
    let home = home_dir()?;
    let text = fs::read_to_string(home.join(".gemini").join("oauth_creds.json")).ok()?;
    let value: serde_json::Value = serde_json::from_str(&text).ok()?;
    value
        .get("access_token")
        .and_then(serde_json::Value::as_str)
        .filter(|token| !token.is_empty())
        .map(str::to_string)
}

/// Gemini's quota, per model bucket, from the same Code Assist endpoints its CLI
/// calls. The quota endpoint needs the project id, which the CLI resolves with
/// `loadCodeAssist` first, so this does the same.
async fn gemini_usage() -> Option<AgentUsage> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .ok()?;
    let token = gemini_token()?;

    let assist: serde_json::Value = client
        .post(GEMINI_ASSIST_URL)
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "metadata": { "ideType": "GEMINI_CLI", "pluginType": "GEMINI" }
        }))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    let project = assist
        .get("cloudaicompanionProject")
        .and_then(serde_json::Value::as_str)?
        .to_string();

    let quota: serde_json::Value = client
        .post(GEMINI_QUOTA_URL)
        .bearer_auth(&token)
        .json(&serde_json::json!({ "project": project }))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    let buckets = quota
        .get("buckets")
        .cloned()
        .unwrap_or_else(|| quota.clone());
    let mut windows = Vec::new();
    for bucket in buckets.as_array().into_iter().flatten() {
        let Some(remaining) = bucket
            .get("remainingFraction")
            .and_then(serde_json::Value::as_f64)
        else {
            continue;
        };
        let model = bucket
            .get("modelId")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("model");
        windows.push(UsageWindow {
            label: gemini_bucket_name(model),
            used_percent: ((1.0 - remaining) * 100.0).clamp(0.0, 100.0),
            window_minutes: 60,
            resets_at: bucket
                .get("resetTime")
                .and_then(serde_json::Value::as_str)
                .and_then(iso_to_epoch)
                .unwrap_or(0),
        });
    }
    if windows.is_empty() {
        return None;
    }
    Some(AgentUsage {
        agent_key: "gemini".to_string(),
        source: "Google Code Assist quota".to_string(),
        windows,
        read_at: now(),
    })
}

/// Reads a number that may arrive as a number or as a numeric string.
fn as_number(value: Option<&serde_json::Value>) -> Option<f64> {
    let value = value?;
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|text| text.parse::<f64>().ok()))
}

/// Window length in minutes from a Kimi `window` block.
fn kimi_window_minutes(window: Option<&serde_json::Value>) -> Option<u64> {
    let window = window?;
    let duration = as_number(window.get("duration"))?;
    let unit = window
        .get("timeUnit")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("")
        .to_uppercase();
    let minutes = if unit.contains("MINUTE") {
        duration
    } else if unit.contains("HOUR") {
        duration * 60.0
    } else if unit.contains("DAY") {
        duration * 60.0 * 24.0
    } else if unit.contains("SECOND") {
        duration / 60.0
    } else {
        duration
    };
    Some(minutes.round().max(1.0) as u64)
}

/// One usage window from a Kimi quota block.
/// @dev Kimi reports `limit` with either `used` or `remaining`, so the used share
/// is derived the same way its CLI derives it.
fn kimi_window(detail: Option<&serde_json::Value>, minutes: u64) -> Option<UsageWindow> {
    let detail = detail?;
    let limit = as_number(detail.get("limit"))?;
    if limit <= 0.0 {
        return None;
    }
    let used = as_number(detail.get("used"))
        .or_else(|| as_number(detail.get("remaining")).map(|remaining| limit - remaining))?;
    let resets_at = detail
        .get("resetTime")
        .or_else(|| detail.get("resetAt"))
        .and_then(serde_json::Value::as_str)
        .and_then(iso_to_epoch)
        .unwrap_or(0);
    Some(UsageWindow {
        label: window_label(minutes),
        used_percent: (used / limit * 100.0).clamp(0.0, 100.0),
        window_minutes: minutes,
        resets_at,
    })
}

/// Kimi's subscription usage, from the same `usages` endpoint its CLI reads.
/// @dev Read-only: the token from `<kimi home>/credentials/kimi-code.json` goes
/// out with a bearer header and nothing else, exactly as the CLI sends it. The
/// file is used as-is — the CLI refreshes it on its next run.
async fn kimi_usage() -> Option<AgentUsage> {
    let home = home_dir()?;
    let path = home
        .join(".kimi")
        .join("credentials")
        .join("kimi-code.json");
    let text = fs::read_to_string(&path).ok()?;
    let credentials: serde_json::Value = serde_json::from_str(&text).ok()?;
    let token = credentials
        .get("access_token")
        .and_then(serde_json::Value::as_str)
        .filter(|token| !token.is_empty())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .ok()?;
    let response = client
        .get("https://api.kimi.com/coding/v1/usages")
        .bearer_auth(token)
        .send()
        .await
        .ok()?;
    if !response.status().is_success() {
        return None;
    }
    let body: serde_json::Value = response.json().await.ok()?;

    // The top-level block is the weekly quota; the `limits` entries carry the
    // shorter rolling windows, the 5-hour one being the session view.
    let mut windows = Vec::new();
    if let Some(window) = kimi_window(body.get("usage"), 10_080) {
        windows.push(window);
    }
    for limit in body
        .get("limits")
        .and_then(serde_json::Value::as_array)
        .into_iter()
        .flatten()
    {
        let minutes = kimi_window_minutes(limit.get("window")).unwrap_or(300);
        if let Some(window) = kimi_window(limit.get("detail"), minutes) {
            windows.push(window);
        }
    }
    if windows.is_empty() {
        return None;
    }
    Some(AgentUsage {
        agent_key: "kimi".to_string(),
        source: "Kimi Code usages API".to_string(),
        windows,
        read_at: now(),
    })
}

/// @notice Reads the usage limits of one agent CLI.
/// @dev Asked per agent, because only a few providers publish an account limit —
// ---------------------------------------------------------------------------
// Web sessions (MiniMax, opencode)
// ---------------------------------------------------------------------------

/// Reads one cookie value out of either a `Cookie` header or a pasted pair list.
/// @dev Both forms are accepted because browsers hand out the header form while
/// devtools copy the `name: "value"` form, and neither should be a trap.
fn cookie_value(raw: &str, name: &str) -> Option<String> {
    for part in raw.split(';') {
        let part = part.trim().trim_start_matches("Cookie:").trim();
        if let Some((key, value)) = part.split_once('=') {
            if key.trim() == name {
                let value = value.trim();
                if !value.is_empty() {
                    return Some(value.to_string());
                }
            }
        }
        if let Some((key, value)) = part.split_once(':') {
            if key.trim().trim_matches(['"', '\'']) == name {
                let value = value.trim().trim_matches(['"', '\'', ' ']);
                if !value.is_empty() {
                    return Some(value.to_string());
                }
            }
        }
    }
    None
}

/// Scales a timestamp down to seconds when it arrives in milliseconds.
fn epoch_seconds(value: Option<&serde_json::Value>) -> Option<i64> {
    let number = as_number(value)? as i64;
    Some(if number > 10_000_000_000 {
        number / 1000
    } else {
        number
    })
}

/// Finds the first object in a payload that carries `key`.
/// @dev These console APIs nest their usage item under envelopes that change
/// without notice, so the item is found by its own field rather than by a path.
fn find_object_with<'a>(value: &'a serde_json::Value, key: &str) -> Option<&'a serde_json::Value> {
    match value {
        serde_json::Value::Object(map) => {
            if map.contains_key(key) {
                return Some(value);
            }
            map.values().find_map(|child| find_object_with(child, key))
        }
        serde_json::Value::Array(items) => {
            items.iter().find_map(|child| find_object_with(child, key))
        }
        _ => None,
    }
}

/// MiniMax's plan windows, from the console endpoint its usage page calls.
/// @dev Read-only, and the same request the console makes: a `Cookie` header that
/// must carry `_token`, the group header when the cookie names one, and the
/// console referer. Remaining percentages become used percentages.
async fn minimax_usage(cookie: &str) -> Option<AgentUsage> {
    let token = cookie_value(cookie, "_token")?;
    let group = cookie_value(cookie, "minimax_group_id_v2");
    let mut cookie_header = format!("_token={token}");
    if let Some(group) = &group {
        cookie_header.push_str(&format!("; minimax_group_id_v2={group}"));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .ok()?;
    let mut request = client
        .get("https://platform.minimax.io/v1/api/openplatform/coding_plan/remains")
        .header("Cookie", cookie_header)
        .header("Referer", "https://platform.minimax.io/console/usage")
        .header("Accept", "application/json");
    if let Some(group) = &group {
        request = request.header("X-Group-Id", group.as_str());
    }
    let response = request.send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let body: serde_json::Value = response.json().await.ok()?;
    let item = find_object_with(&body, "current_interval_remaining_percent")?;

    let mut windows = Vec::new();
    if let Some(remaining) = as_number(item.get("current_interval_remaining_percent")) {
        windows.push(UsageWindow {
            label: "5h".to_string(),
            used_percent: (100.0 - remaining).clamp(0.0, 100.0),
            window_minutes: 300,
            resets_at: epoch_seconds(item.get("end_time")).unwrap_or(0),
        });
    }
    if let Some(remaining) = as_number(item.get("current_weekly_remaining_percent")) {
        // The API exposes no weekly end time, only how long it still runs.
        let resets_at = as_number(item.get("weekly_remains_time"))
            .map(|seconds| now() + seconds as i64)
            .unwrap_or(0);
        windows.push(UsageWindow {
            label: "7d".to_string(),
            used_percent: (100.0 - remaining).clamp(0.0, 100.0),
            window_minutes: 10_080,
            resets_at,
        });
    }
    if windows.is_empty() {
        return None;
    }
    Some(AgentUsage {
        agent_key: "minimax".to_string(),
        source: "MiniMax console API".to_string(),
        windows,
        read_at: now(),
    })
}

/// The site's server-function id for the workspaces call, and its origin.
/// @dev The id belongs to their build, so it changes whenever they deploy — this
/// is the value Orca ships, and the thing to update when opencode's shape moves.
const OPENCODE_BASE_URL: &str = "https://opencode.ai";
const OPENCODE_WORKSPACES_SERVER_ID: &str =
    "def39973159c7f0483d8793a822b8dbb10d067e12c65455fcb4608459ba0234f";

/// A numeric field at depth 1 of `block`.
/// @dev Nested objects carrying the same name are skipped, which is what makes
/// the placeholder duplicates in the page harmless.
fn top_level_number(block: &str, field: &str) -> Option<f64> {
    let needle = format!("{field}:");
    let mut depth = 0_i64;
    for (index, character) in block.char_indices() {
        match character {
            '{' => {
                depth += 1;
                continue;
            }
            '}' => {
                depth -= 1;
                continue;
            }
            _ => {}
        }
        if depth != 1 || !block[index..].starts_with(&needle) {
            continue;
        }
        let rest = block[index + needle.len()..].trim_start();
        let number: String = rest
            .chars()
            .take_while(|character| {
                character.is_ascii_digit() || *character == '.' || *character == '-'
            })
            .collect();
        if let Ok(value) = number.parse::<f64>() {
            return Some(value);
        }
    }
    None
}

/// The `usagePercent` and `resetInSec` of the first block carrying both.
/// @dev The page is React Server Components output: a key appears several times,
/// once with data and once as `null`, and a reference token such as `$R[28]=` may
/// sit between the colon and the brace. This scrapes markup we do not control, so
/// a miss answers None instead of a guess.
fn opencode_block(text: &str, key: &str) -> Option<(f64, i64)> {
    let needle = format!("{key}:");
    let mut from = 0_usize;
    while let Some(offset) = text[from..].find(&needle) {
        let colon = from + offset + needle.len();
        from = colon;
        let window_end = (colon + 30).min(text.len());
        let Some(brace_offset) = text[colon..window_end].find('{') else {
            continue;
        };
        let open = colon + brace_offset;
        let mut depth = 0_i64;
        let mut close = None;
        for (index, character) in text[open..].char_indices() {
            match character {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        close = Some(open + index);
                        break;
                    }
                }
                _ => {}
            }
        }
        let Some(close) = close else {
            continue;
        };
        let block = &text[open..=close];
        if let (Some(percent), Some(reset)) = (
            top_level_number(block, "usagePercent"),
            top_level_number(block, "resetInSec"),
        ) {
            return Some((percent, reset));
        }
    }
    None
}

/// The workspace whose usage page is read: the first `id` the payload offers,
/// preferring one inside a `workspaces` list.
fn find_workspace_id(body: &serde_json::Value) -> Option<String> {
    fn first_id(value: &serde_json::Value) -> Option<String> {
        match value {
            serde_json::Value::Object(map) => {
                if let Some(serde_json::Value::String(id)) = map.get("id") {
                    if !id.is_empty() {
                        return Some(id.clone());
                    }
                }
                map.values().find_map(first_id)
            }
            serde_json::Value::Array(items) => items.iter().find_map(first_id),
            _ => None,
        }
    }
    body.get("workspaces")
        .and_then(first_id)
        .or_else(|| first_id(body))
}

/// opencode's plan windows, read from its workspace page.
/// @dev Two steps, like the site itself: the workspaces call names the workspace,
/// then the `/go` page carries the numbers. opencode publishes no local source for
/// these, so this is a scraper by necessity.
async fn opencode_usage(credential: &str) -> Option<AgentUsage> {
    let cookie = credential.trim();
    if cookie.is_empty() {
        return None;
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .ok()?;

    let workspaces = client
        .get(format!(
            "{OPENCODE_BASE_URL}/_server?id={OPENCODE_WORKSPACES_SERVER_ID}"
        ))
        .header("Cookie", cookie)
        .header("Origin", OPENCODE_BASE_URL)
        .header("Referer", format!("{OPENCODE_BASE_URL}/"))
        .send()
        .await
        .ok()?;
    if !workspaces.status().is_success() {
        return None;
    }
    let body: serde_json::Value = workspaces.json().await.ok()?;
    let workspace_id = find_workspace_id(&body)?;

    let page = client
        .get(format!("{OPENCODE_BASE_URL}/workspace/{workspace_id}/go"))
        .header("Cookie", cookie)
        .header("Origin", OPENCODE_BASE_URL)
        .header("Referer", format!("{OPENCODE_BASE_URL}/"))
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        )
        .send()
        .await
        .ok()?;
    if !page.status().is_success() {
        return None;
    }
    let text = page.text().await.ok()?;
    if text.len() > 10_000_000 {
        return None;
    }

    let mut windows = Vec::new();
    for (key, label, minutes) in [
        ("rollingUsage", "5h", 300_u64),
        ("weeklyUsage", "7d", 10_080),
        ("monthlyUsage", "30d", 43_200),
    ] {
        if let Some((percent, reset)) = opencode_block(&text, key) {
            windows.push(UsageWindow {
                label: label.to_string(),
                used_percent: percent.clamp(0.0, 100.0),
                window_minutes: minutes,
                resets_at: now() + reset,
            });
        }
    }
    if windows.is_empty() {
        return None;
    }
    Some(AgentUsage {
        agent_key: "opencode".to_string(),
        source: "opencode workspace page".to_string(),
        windows,
        read_at: now(),
    })
}

/// @notice Reads the usage limits of one agent CLI.
/// @dev One agent per call on purpose: with a large catalog only a few providers
/// publish readable limits, so the panel asks for the one the user selected
/// rather than revealing every agent all the time. Providers that cannot be read
/// answer `None`, which the panel states plainly rather than guessing.
/// @param agent_key Agent key from the frontend catalog, e.g. `codex`.
/// @param credential Session cookie or token for the providers that read a web
/// session (Minimax, opencode); the file-based providers ignore it.
/// @return The provider's usage, or None when nothing can be read.
#[tauri::command]
pub async fn agent_usage(agent_key: String, credential: Option<String>) -> Option<AgentUsage> {
    match agent_key.as_str() {
        "codex" => codex_usage(),
        // Claude is asked the way its CLI asks: the usage endpoint first, and the
        // statusline mirror only when that cannot be read.
        "claude" => match claude_oauth_usage().await {
            Some(usage) => Some(usage),
            None => claude_usage(),
        },
        "grok" => grok_usage().await,
        "gemini" => gemini_usage().await,
        // Antigravity has no reader of its own: it shares Google Code Assist
        // quota with the Gemini CLI, so a successful Gemini read describes it too.
        "antigravity" => gemini_usage().await.map(|usage| AgentUsage {
            agent_key: "antigravity".to_string(),
            ..usage
        }),
        "kimi" => kimi_usage().await,
        // The two web-session providers have nothing to read without the cookie
        // the user pasted in Settings, so they answer None until one is stored.
        "minimax" => minimax_usage(credential.as_deref()?).await,
        "opencode" => opencode_usage(credential.as_deref()?).await,
        _ => None,
    }
}
