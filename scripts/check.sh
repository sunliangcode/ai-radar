#!/usr/bin/env bash
# Local checks aligned with CI (backend / frontend / mcp).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0

run() {
  local label="$1"
  shift
  echo
  echo "==> $label"
  if "$@"; then
    echo "OK  $label"
  else
    echo "FAIL $label"
    fail=1
  fi
}

# Inherit the caller's PATH (login shells may pin an older Node that Vite 8 cannot use).
run "backend tests" bash -c 'cd "$1" && ./mvnw -B -q test' _ "$ROOT/backend"

if [[ -d frontend/node_modules ]]; then
  run "frontend lint" bash -c 'cd "$1" && npm run lint' _ "$ROOT/frontend"
  run "frontend tests" bash -c 'cd "$1" && npm run test' _ "$ROOT/frontend"
  run "frontend build" bash -c 'cd "$1" && npm run build' _ "$ROOT/frontend"
else
  echo
  echo "SKIP frontend (run: cd frontend && npm install)"
fi

if [[ -d mcp/node_modules ]]; then
  run "mcp syntax" bash -c 'cd "$1" && node --check server.mjs' _ "$ROOT/mcp"
else
  echo
  echo "SKIP mcp (run: cd mcp && npm install)"
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "All checks passed."
  exit 0
fi
echo "Some checks failed."
exit 1
