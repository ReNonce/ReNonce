#!/usr/bin/env bash
# @title ReNonce dependency install
# @notice Installs JS dependencies for lib/desktop (npm ci: clean, reproducible).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../lib/desktop"
exec npm ci
