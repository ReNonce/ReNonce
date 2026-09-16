//! @title Terminal sessions
//! @notice PTY-backed shells for the center panel terminal.
//! @dev `portable-pty` gives one API over forkpty (Unix) and ConPTY (Windows),
//! @dev so the same code drives the user's shell on macOS/Linux and PowerShell
//! @dev on Windows. Output crosses the IPC boundary base64-encoded, which keeps
//! @dev multi-byte UTF-8 sequences intact when a read splits them. Sessions are
//! @dev keyed by the id the frontend picks and live in managed state.
//! @dev A shell runs with the user's own OS permissions, so the terminal cannot
//! @dev be "read-only": only the app's own file commands can be gated.

use base64::Engine;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Mutex;
use tauri::ipc::Channel;
use tauri::State;

/// @notice Event pushed to the frontend's channel.
/// @dev Tagged so the frontend can switch on `kind`.
#[derive(Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PtyEvent {
    /// Terminal output, base64-encoded raw bytes.
    Data { data: String },
    /// The shell process ended.
    Exit,
    /// The session hit an I/O error.
    Error { message: String },
}

/// @notice A shell the terminal can launch, for the + menu.
#[derive(Clone, Serialize)]
pub struct ShellInfo {
    /// Display name (the program's file name).
    pub name: String,
    /// Program to launch, e.g. "/bin/bash" or "pwsh.exe".
    pub path: String,
}

/// @notice A live shell: the pty handle, its stdin, and the child process.
struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

/// @notice Managed state holding every open session.
#[derive(Default)]
pub struct PtyState {
    sessions: Mutex<HashMap<String, PtySession>>,
}

/// @notice Shells to try on Windows, best first.
/// @dev PowerShell 7 and Windows PowerShell speak ANSI/truecolor; `cmd.exe` is
/// @dev the last resort.
/// @param preferred Shell picked in the UI, tried before the defaults.
/// @return Candidate programs with their arguments.
#[cfg(windows)]
fn shell_candidates(preferred: Option<&str>) -> Vec<(String, Vec<String>)> {
    let mut candidates: Vec<(String, Vec<String>)> = Vec::new();
    if let Some(shell) = preferred {
        candidates.push((shell.to_string(), Vec::new()));
    }
    candidates.push(("pwsh.exe".to_string(), vec!["-NoLogo".to_string()]));
    candidates.push(("powershell.exe".to_string(), vec!["-NoLogo".to_string()]));
    candidates.push(("cmd.exe".to_string(), Vec::new()));
    candidates
}

/// @notice Shells to try on Unix, best first.
/// @dev `$SHELL` wins so the terminal matches the user's setup; bash and sh are
/// @dev the fallbacks when it is unset or missing.
/// @param preferred Shell picked in the UI, tried before the defaults.
/// @return Candidate programs with their arguments.
#[cfg(not(windows))]
fn shell_candidates(preferred: Option<&str>) -> Vec<(String, Vec<String>)> {
    let mut candidates: Vec<(String, Vec<String>)> = Vec::new();
    if let Some(shell) = preferred {
        candidates.push((shell.to_string(), Vec::new()));
    }
    if let Ok(shell) = std::env::var("SHELL") {
        candidates.push((shell, Vec::new()));
    }
    candidates.push(("/bin/bash".to_string(), Vec::new()));
    candidates.push(("/bin/sh".to_string(), Vec::new()));
    candidates
}

/// @notice Shells offered in the + menu on Windows.
/// @return PowerShell variants and `cmd.exe`, best first.
#[cfg(windows)]
fn available_shells() -> Vec<ShellInfo> {
    ["pwsh.exe", "powershell.exe", "cmd.exe"]
        .iter()
        .map(|program| ShellInfo {
            name: program.to_string(),
            path: program.to_string(),
        })
        .collect()
}

/// @notice Shells offered in the + menu on Unix.
/// @dev `$SHELL` first, then every entry of `/etc/shells`, then bash and sh;
/// @dev duplicates are dropped and the list is capped.
/// @return The shells, best first.
#[cfg(not(windows))]
fn available_shells() -> Vec<ShellInfo> {
    let mut paths: Vec<String> = Vec::new();
    if let Ok(shell) = std::env::var("SHELL") {
        paths.push(shell);
    }
    if let Ok(contents) = std::fs::read_to_string("/etc/shells") {
        for line in contents.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            paths.push(trimmed.to_string());
        }
    }
    paths.push("/bin/bash".to_string());
    paths.push("/bin/sh".to_string());

    let mut shells: Vec<ShellInfo> = Vec::new();
    for path in paths {
        if shells.iter().any(|shell| shell.path == path) {
            continue;
        }
        let name = Path::new(&path)
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.clone());
        shells.push(ShellInfo { name, path });
        if shells.len() >= 8 {
            break;
        }
    }
    shells
}

/// @notice Lists the shells the terminal can launch.
/// @return Available shells, best first; empty when nothing usable was found.
#[tauri::command]
pub fn list_shells() -> Vec<ShellInfo> {
    available_shells()
}

/// @notice Starts a shell inside a new PTY and streams its output.
/// @dev Tries the platform candidates in order; the first that spawns wins.
/// @param id Frontend-chosen session id, also the key for write/resize/close.
/// @param cwd Working directory, or null for the process default.
/// @param shell Shell picked in the UI, or null for the platform default.
/// @param cols Initial width in columns.
/// @param rows Initial height in rows.
/// @param on_event Channel receiving base64 output and lifecycle events.
/// @param state Managed PTY state.
/// @return Nothing, or a message when no shell could be started.
#[tauri::command]
pub fn pty_open(
    id: String,
    cwd: Option<String>,
    shell: Option<String>,
    cols: u16,
    rows: u16,
    on_event: Channel<PtyEvent>,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };
    let mut last_error = "no shell available".to_string();

    for (program, args) in shell_candidates(shell.as_deref()) {
        let pair = pty_system
            .openpty(size)
            .map_err(|error| error.to_string())?;
        let mut command = CommandBuilder::new(&program);
        for arg in &args {
            command.arg(arg);
        }
        command.env("TERM", "xterm-256color");
        command.env("COLORTERM", "truecolor");
        if let Some(dir) = cwd.as_deref() {
            if Path::new(dir).is_dir() {
                command.cwd(dir);
            }
        }

        let child = match pair.slave.spawn_command(command) {
            Ok(child) => child,
            Err(error) => {
                last_error = format!("{program}: {error}");
                continue;
            }
        };
        drop(pair.slave);

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| error.to_string())?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|error| error.to_string())?;

        let event_channel = on_event.clone();
        std::thread::spawn(move || {
            let mut reader = reader;
            let mut buffer = [0_u8; 8192];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        let _ = event_channel.send(PtyEvent::Exit);
                        break;
                    }
                    Ok(read) => {
                        let data =
                            base64::engine::general_purpose::STANDARD.encode(&buffer[..read]);
                        if event_channel.send(PtyEvent::Data { data }).is_err() {
                            break;
                        }
                    }
                    Err(error) => {
                        let _ = event_channel.send(PtyEvent::Error {
                            message: error.to_string(),
                        });
                        break;
                    }
                }
            }
        });

        let mut sessions = state
            .sessions
            .lock()
            .map_err(|_| "pty state is poisoned".to_string())?;
        sessions.insert(
            id,
            PtySession {
                master: pair.master,
                writer,
                child,
            },
        );
        return Ok(());
    }

    Err(last_error)
}

/// @notice Writes terminal input to a session's shell.
/// @param id Session id from `pty_open`.
/// @param data UTF-8 input from the terminal widget.
/// @param state Managed PTY state.
/// @return Nothing, or a message when the session is gone.
#[tauri::command]
pub fn pty_write(id: String, data: String, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "pty state is poisoned".to_string())?;
    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| "unknown session".to_string())?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|error| error.to_string())?;
    session.writer.flush().map_err(|error| error.to_string())
}

/// @notice Resizes a session's PTY after the terminal widget changes size.
/// @param id Session id from `pty_open`.
/// @param cols New width in columns.
/// @param rows New height in rows.
/// @param state Managed PTY state.
/// @return Nothing, or a message when the session is gone.
#[tauri::command]
pub fn pty_resize(
    id: String,
    cols: u16,
    rows: u16,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    let sessions = state
        .sessions
        .lock()
        .map_err(|_| "pty state is poisoned".to_string())?;
    let session = sessions
        .get(&id)
        .ok_or_else(|| "unknown session".to_string())?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| error.to_string())
}

/// @notice Closes a session, killing its shell.
/// @param id Session id from `pty_open`.
/// @param state Managed PTY state.
/// @return Nothing.
#[tauri::command]
pub fn pty_close(id: String, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "pty state is poisoned".to_string())?;
    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill();
    }
    Ok(())
}
