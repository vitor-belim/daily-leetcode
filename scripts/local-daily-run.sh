#!/bin/bash
set -euo pipefail

export PATH="/usr/local/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
LOG_TAG="[daily-leetcode]"

cd "$REPO_DIR"

GH_PUSH_USER="vitor-belim"
GH_ORIGINAL_USER="vitor-belim-ovyo"
gh auth switch --hostname github.com --user "$GH_PUSH_USER" >/dev/null
trap 'gh auth switch --hostname github.com --user "$GH_ORIGINAL_USER" >/dev/null' EXIT

export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm use default

git pull --ff-only

set +e
npm run fetch-daily -- --problem-only
FETCH_STATUS=$?
set -e

git add data/problems
if git diff --cached --quiet -- data/problems; then
  echo "$LOG_TAG No changes to commit."
else
  git commit -m "Automated: fetch daily LeetCode challenge" -- data/problems
  git push
fi

if [ "$FETCH_STATUS" -ne 0 ]; then
  if [ -x /usr/local/bin/terminal-notifier ]; then
    /usr/local/bin/terminal-notifier \
      -title "Daily LeetCode fetch failed" \
      -message "Check ~/Library/Logs/daily-leetcode.log" \
      -sound default \
      -open "file://$HOME/Library/Logs/daily-leetcode.log"
  fi
  exit "$FETCH_STATUS"
fi
