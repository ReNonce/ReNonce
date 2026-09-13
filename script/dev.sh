#!/usr/bin/env bash
# @title ReNonce dev server
# @notice Starts the Tauri desktop app in development mode with hot-reload.
# @dev Restart required after any tauri.conf.json change (config is not hot-reloaded).
# @dev Borderless window has no drag/close yet; use Alt+F4 or the taskbar to close.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../apps/desktop"
exec npm run tauri dev
