#!/usr/bin/env bash
# @title ReNonce icon regeneration
# @notice Regenerates apps/desktop/src-tauri/icons/ from the opaque brand master.
# @dev Never hand-edit src-tauri/icons/; rerun this script when the logo changes.
# @dev Requires JS dependencies first (script/install.sh).
set -euo pipefail
APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/../apps/desktop" && pwd)"
if [[ ! -x "$APP/node_modules/.bin/tauri" ]]; then
  echo "missing Tauri CLI, run script/install.sh first" >&2
  exit 1
fi
exec "$APP/node_modules/.bin/tauri" icon "$APP/public/assets/brand/ReNonce-Icon-1024x1024/ReNonce-Icon-1024x1024-1x.png"
