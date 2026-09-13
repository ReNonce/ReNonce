//! @title ReNonce backend library
//! @notice Tauri command handlers and application bootstrap for the ReNonce desktop app.
//! @dev Entry point is `run()`, called by the binary target in `main.rs`.
//! @dev Window config (title, size, decorations) lives in `tauri.conf.json`.

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
/// @notice Greets a user by name.
/// @dev Template command, currently unused by the blank frontend. Remove once real audit commands land.
/// @param name The name to greet.
/// @return A greeting message from the Rust backend.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// @notice Builds and runs the ReNonce Tauri application.
/// @dev Registers the opener + shell plugins and all invoke handlers, then blocks on the event loop.
/// @dev The shell plugin is initialized sidecar-ready: no binaries are bundled yet, so no
/// @dev `bundle.externalBin` entries or shell capability scopes exist. Add both when the first
/// @dev tool lands in `lib/sidecars/` (see its README for the exact snippets).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
