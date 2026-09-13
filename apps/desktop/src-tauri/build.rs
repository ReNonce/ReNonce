//! @title ReNonce build script
//! @notice Runs `tauri_build` so Tauri codegen (context, icons, capabilities) happens at compile time.
//! @dev Executed by Cargo before compiling the binary and library targets.

fn main() {
    tauri_build::build()
}
