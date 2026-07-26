#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
LOG_TAG="[daily-leetcode]"

cd "$REPO_DIR"

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
