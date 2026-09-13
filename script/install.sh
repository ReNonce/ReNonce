#!/usr/bin/env bash
# @title ReNonce dependency install
# @notice Installs JS dependencies for apps/desktop (npm ci: clean, reproducible).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../apps/desktop"
exec npm ci
