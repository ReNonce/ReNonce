#!/bin/sh
# @title Claude usage mirror
# @notice Statusline wrapper for Claude Code that keeps the statusline you already
# have working, and additionally copies the JSON Claude sends to it into
# ~/.claude/renonce-usage.json — the file ReNonce reads to show your plan limits.
# @dev Claude only exposes `rate_limits` (the 5-hour and weekly windows) to a
# statusline command, so a mirror is the one way to surface them without calling
# the vendor API. Install steps, run once:
#
#   1. Keep the current statusline where this wrapper can call it:
#        node -e 'const fs=require("fs"),p=process.env.HOME+"/.claude/settings.json"; \
#          const j=JSON.parse(fs.readFileSync(p,"utf8")); \
#          fs.writeFileSync(process.env.HOME+"/.claude/renonce-statusline-inner.sh", \
#            "#!/bin/sh\n"+j.statusLine.command+"\n", {mode:0o755});'
#   2. Point the statusline at this script:
#        chmod +x claude-usage-mirror.sh
#        node -e '... set settings.json statusLine.command to this script path ...'
#
# The wrapper feeds the same stdin to the saved command, so the statusline itself
# is unchanged; only the mirror file is new. Delete it and restore the saved
# command to undo everything.

set -eu

MIRROR="${HOME}/.claude/renonce-usage.json"
INNER="${HOME}/.claude/renonce-statusline-inner.sh"

# Read everything Claude sends, once.
payload=$(cat)

# Mirror it for ReNonce; never let a failure break the statusline.
if [ -n "$payload" ]; then
  printf '%s' "$payload" >"$MIRROR" 2>/dev/null || :
fi

# Hand the very same payload to the statusline that was configured before.
if [ -x "$INNER" ]; then
  printf '%s' "$payload" | "$INNER" || :
fi
