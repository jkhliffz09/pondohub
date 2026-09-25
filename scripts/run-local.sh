#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bundled_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
if [ -x "$bundled_node/node" ]; then
  export PATH="$bundled_node:$PATH"
fi
if ! node --version >/dev/null 2>&1; then
  echo 'Install Node.js 22.13 or newer, then run this script again.' >&2
  exit 1
fi
command_name="${1:-dev}"
case "$command_name" in
  dev|api|mobile|web|test|typecheck|export) npm run "$command_name" ;;
  *) echo 'Usage: ./scripts/run-local.sh [dev|api|mobile|web|test|typecheck|export]' >&2; exit 1 ;;
esac
