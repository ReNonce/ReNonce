#!/usr/bin/env bash
# @title ReNonce release build
# @notice Builds the production desktop bundle (tsc + vite build run first via beforeBuildCommand).
# @dev Requires Tauri system dependencies, see README prerequisites.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../apps/desktop"
exec npm run tauri build
