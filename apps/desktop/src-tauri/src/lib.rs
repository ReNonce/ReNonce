//! @title ReNonce backend library
//! @notice Tauri command handlers and application bootstrap for the ReNonce desktop app.
//! @dev Entry point is `run()`, called by the binary target in `main.rs`.
//! @dev Window config (title, size, decorations) lives in `tauri.conf.json`.

use serde::Serialize;
use std::fs;

mod pty;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
/// @notice Greets a user by name.
/// @dev Template command, currently unused by the blank frontend. Remove once real audit commands land.
/// @param name The name to greet.
/// @return A greeting message from the Rust backend.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// @notice One child of a directory, ready for the file explorer.
/// @dev `isDir` is camelCase because it is consumed directly by the frontend.
#[derive(Serialize)]
struct DirEntryInfo {
    name: String,
    path: String,
    #[serde(rename = "isDir")]
    is_dir: bool,
}

/// @notice Lists the direct children of a directory.
/// @dev Full filesystem access is intentional: the app gates it behind the user's
/// @dev consent screen (planned). Entries come back sorted folders-first, then
/// @dev case-insensitively by name. Runs async so large folders never block the UI.
/// @param path Absolute directory path to list.
/// @return The sorted entries, or the OS error message.
#[tauri::command]
async fn read_dir(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let entries = fs::read_dir(&path).map_err(|error| error.to_string())?;
    let mut result: Vec<DirEntryInfo> = Vec::new();
    for entry in entries.flatten() {
        let is_dir = entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false);
        result.push(DirEntryInfo {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry.path().to_string_lossy().into_owned(),
            is_dir,
        });
    }
    result.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(result)
}

/// @notice Finds entries whose name contains `query`, depth-first from `root`.
/// @dev Case-insensitive substring match on the name. Skips symlinks (so the
/// @dev walk can never loop) and caps both the visited entries and the results,
/// @dev so huge trees cannot stall the UI.
/// @param root Absolute directory to search.
/// @param query Substring to look for; an empty query yields no results.
/// @param limit Maximum number of results to return.
/// @return Matching entries, or the OS error message.
#[tauri::command]
async fn search_files(
    root: String,
    query: String,
    limit: usize,
) -> Result<Vec<DirEntryInfo>, String> {
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Ok(Vec::new());
    }

    const MAX_VISITED: usize = 20_000;
    let mut results: Vec<DirEntryInfo> = Vec::new();
    let mut stack = vec![std::path::PathBuf::from(&root)];
    let mut visited = 0_usize;

    while let Some(directory) = stack.pop() {
        if visited >= MAX_VISITED || results.len() >= limit {
            break;
        }
        let entries = match fs::read_dir(&directory) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            visited += 1;
            if visited >= MAX_VISITED || results.len() >= limit {
                break;
            }
            let Ok(file_type) = entry.file_type() else {
                continue;
            };
            if file_type.is_symlink() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            let is_dir = file_type.is_dir();
            if name.to_lowercase().contains(&needle) {
                results.push(DirEntryInfo {
                    name,
                    path: entry.path().to_string_lossy().into_owned(),
                    is_dir,
                });
            }
            if is_dir {
                stack.push(entry.path());
            }
        }
    }

    Ok(results)
}

/// @notice Creates a directory for the explorer's new-folder action.
/// @dev Write access is intentional and still gated only by the OS; the consent
/// @dev screen that will mediate writes is on the roadmap.
/// @param path Absolute path of the folder to create.
/// @return Nothing, or the OS error message (for example when it already exists).
#[tauri::command]
async fn create_folder(path: String) -> Result<(), String> {
    fs::create_dir(&path).map_err(|error| error.to_string())
}

/// @notice Creates an empty file for the explorer's new-file action.
/// @dev `create_new` leaves an existing file untouched instead of truncating it.
/// @param path Absolute path of the file to create.
/// @return Nothing, or the OS error message (for example when it already exists).
#[tauri::command]
async fn create_file(path: String) -> Result<(), String> {
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

/// @notice Reads a text file for the editor tab.
/// @dev Capped at 2 MiB so opening a huge file can never freeze the IPC layer.
/// @param path Absolute file path.
/// @return The file's contents, or the OS error message.
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    const MAX_BYTES: u64 = 2 * 1024 * 1024;
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_BYTES {
        return Err(format!("file is larger than {MAX_BYTES} bytes"));
    }
    fs::read_to_string(&path).map_err(|error| error.to_string())
}

/// @notice Writes a file back from the editor tab.
/// @param path Absolute file path.
/// @param contents New file contents.
/// @return Nothing, or the OS error message.
#[tauri::command]
async fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|error| error.to_string())
}

/// @notice Moves (renames) an entry, used by explorer drag and drop.
/// @dev `fs::rename` keeps it atomic within one filesystem; the frontend already
/// @dev rejects drops onto the entry's own parent or into itself.
/// @param from Absolute path of the entry to move.
/// @param to Absolute destination path, including the entry name.
/// @return Nothing, or the OS error message.
#[tauri::command]
async fn move_entry(from: String, to: String) -> Result<(), String> {
    fs::rename(&from, &to).map_err(|error| error.to_string())
}

/// @notice Deletes a file, or a folder with everything inside it.
/// @dev The frontend confirms first; this command trusts its caller.
/// @param path Absolute path of the entry to delete.
/// @return Nothing, or the OS error message.
#[tauri::command]
async fn delete_entry(path: String) -> Result<(), String> {
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    if metadata.is_dir() {
        fs::remove_dir_all(&path).map_err(|error| error.to_string())
    } else {
        fs::remove_file(&path).map_err(|error| error.to_string())
    }
}

/// @notice Moves an entry to the operating system's trash.
/// @param path Absolute path of the entry to trash.
/// @return Nothing, or the OS error message.
#[tauri::command]
async fn trash_entry(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|error| error.to_string())
}

/// @notice Copies a file, or a folder with everything inside it.
/// @param from Absolute source path.
/// @param to Absolute destination path (must not exist yet).
/// @return Nothing, or the OS error message.
#[tauri::command]
async fn copy_entry(from: String, to: String) -> Result<(), String> {
    copy_recursive(std::path::Path::new(&from), std::path::Path::new(&to))
        .map_err(|error| error.to_string())
}

fn copy_recursive(from: &std::path::Path, to: &std::path::Path) -> std::io::Result<()> {
    if from.is_dir() {
        fs::create_dir_all(to)?;
        for entry in fs::read_dir(from)? {
            let entry = entry?;
            copy_recursive(&entry.path(), &to.join(entry.file_name()))?;
        }
        Ok(())
    } else {
        fs::copy(from, to).map(|_| ())
    }
}

/// @notice Builds and runs the ReNonce Tauri application.
/// @dev Registers the opener, shell, and dialog plugins plus all invoke handlers,
/// @dev then blocks on the event loop. PTY sessions live in managed state so the
/// @dev terminal keeps running while the UI switches views.
/// @dev The shell plugin is initialized for future audit-tool sidecars. No binaries are
/// @dev bundled yet, so no `bundle.externalBin` entries or shell capability scopes exist.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(pty::PtyState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_dir,
            search_files,
            create_folder,
            create_file,
            read_file,
            write_file,
            move_entry,
            delete_entry,
            trash_entry,
            copy_entry,
            pty::list_shells,
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
