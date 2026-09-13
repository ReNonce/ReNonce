#!/usr/bin/env bash
# @title ReNonce static checks
# @notice Runs the fast local gates from CI: tsc typecheck + cargo fmt check.
# @dev Clippy needs Tauri system dependencies; it runs in CI, see .github/workflows/ci.yml.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/lib/desktop"
npx tsc --noEmit
cd "$ROOT/lib/desktop/src-tauri"
cargo fmt --all -- --check
echo "checks passed"
