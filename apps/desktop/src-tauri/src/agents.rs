//! @title Agent commands
//! @notice Answers which agent CLIs are actually installed on this machine.
//! @dev The catalog itself lives in the frontend; this only reports which of the
//! command names it lists can be run here, so the picker — and the usage list —
//! stay to what the user really has.

use std::env;
use std::path::Path;

/// @notice Filters command names down to the ones installed.
/// @dev Searches PATH the way a shell does, plus PATHEXT on Windows, so a CLI
/// installed through npm, mise, or a system package is found without the app
/// needing to know where any of them live.
/// @param commands Command names, e.g. `["claude", "codex"]`.
/// @return The subset that exists and is executable.
#[tauri::command]
pub fn command_availability(commands: Vec<String>) -> Vec<String> {
    commands
        .into_iter()
        .filter(|name| is_installed(name))
        .collect()
}

/// Whether `name` resolves to something runnable on PATH.
fn is_installed(name: &str) -> bool {
    let Ok(path) = env::var("PATH") else {
        return false;
    };
    let extensions: Vec<String> = if cfg!(windows) {
        env::var("PATHEXT")
            .unwrap_or_else(|_| ".EXE;.CMD;.BAT;.COM".to_string())
            .split(';')
            .map(|value| value.to_lowercase())
            .collect()
    } else {
        vec![String::new()]
    };

    for folder in env::split_paths(&path) {
        for extension in &extensions {
            if is_runnable(&folder.join(format!("{name}{extension}"))) {
                return true;
            }
        }
    }
    false
}

/// A file that exists and, on Unix, carries an execute bit.
fn is_runnable(path: &Path) -> bool {
    let Ok(metadata) = path.metadata() else {
        return false;
    };
    if !metadata.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        metadata.permissions().mode() & 0o111 != 0
    }
    #[cfg(not(unix))]
    {
        true
    }
}
