//! @title ReNonce binary entry point
//! @notice Launches the ReNonce desktop app via `renonce_lib::run()`.
//! @dev The `windows_subsystem` attribute below hides the extra console window
//! @dev on Windows release builds. DO NOT REMOVE.

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    renonce_lib::run()
}
