#!/usr/bin/env bash
# @title ReNonce clean
# @notice Removes regenerable build outputs (Vite dist, Rust target). node_modules kept.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rm -rf "$ROOT/lib/desktop/dist" "$ROOT/lib/desktop/src-tauri/target"
echo "cleaned"
