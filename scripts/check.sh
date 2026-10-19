#!/usr/bin/env bash
# Local checks aligned with CI (backend / frontend / mcp / cli).
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

# Syntax-only — no node_modules required for --check
run "mcp syntax" bash -c 'cd "$1" && node --check server.mjs && node --check errors.mjs' _ "$ROOT/mcp"
run "shared tests" bash -c '
  set -euo pipefail
  cd "$1"
  for f in *.mjs; do
    case "$f" in *.test.mjs) continue ;; esac
    node --check "$f"
  done
  # Glob so new *.test.mjs files are never skipped in CI
  node --test *.test.mjs
' _ "$ROOT/shared"
run "cli syntax" bash -c 'cd "$1" && node --check ai-radar.mjs' _ "$ROOT/cli"
run "exec bits" bash -c '
  set -euo pipefail
  ROOT="$1"
  test -x "$ROOT/bin/ai-radar"
  test -x "$ROOT/install.sh"
  test -x "$ROOT/stop.sh"
  test -x "$ROOT/scripts/check.sh"
  test -x "$ROOT/scripts/status.sh"
  test -x "$ROOT/scripts/backup.sh"
  test -x "$ROOT/scripts/smoke-extensibility.sh"
' _ "$ROOT"
run "cli smoke" bash -c '
  set -euo pipefail
  ROOT="$1"
  out="$("$ROOT/bin/ai-radar" version)"
  echo "$out" | grep -q "ai-radar-cli"
  help="$("$ROOT/bin/ai-radar" help)"
  echo "$help" | grep -q "pack import"
  echo "$help" | grep -q "pack validate"
  echo "$help" | grep -q "pack list"
  echo "$help" | grep -q "connectors"
  echo "$help" | grep -q "delivery-channels"
  echo "$help" | grep -q "doctor"
  echo "$help" | grep -q "modelPresent"
  echo "$help" | grep -q "health-llm"
  echo "$help" | grep -q "version, DB"
  echo "$help" | grep -q "AI_RADAR_DB"
  echo "$help" | grep -q "BACKUP_KEEP"
  echo "$help" | grep -q "AI_RADAR_TIMEOUT_MS"
  echo "$help" | grep -q -- "--path"
  test -f "$ROOT/examples/packs/demo-local.json"
  ok="$("$ROOT/bin/ai-radar" pack validate "$ROOT/examples/packs/demo-local.json")"
  echo "$ok" | grep -q "\"ok\": true"
  # pack list must exit 0 (every built-in pack schema-ok)
  listed="$("$ROOT/bin/ai-radar" pack list)"
  echo "$listed" | grep -q "ai-core"
  echo "$listed" | grep -q "ai-cn"
  echo "$listed" | grep -q "ai-signals"
  echo "$listed" | grep -q "\"ok\": true"
  # Preflight: missing --path exits 2 with clear message (no backend needed)
  miss="$(AI_RADAR_BASE_URL=http://127.0.0.1:1 "$ROOT/bin/ai-radar" pack import x --path /no/such/pack.json 2>&1 || true)"
  echo "$miss" | grep -qi "not found"
  bad="$("$ROOT/bin/ai-radar" pack validate /no/such/pack.json 2>&1 || true)"
  echo "$bad" | grep -qi "not found"
  # Doctor offline: structured next steps (not a bare fetch failed)
  doc="$(AI_RADAR_BASE_URL=http://127.0.0.1:1 "$ROOT/bin/ai-radar" doctor 2>&1 || true)"
  echo "$doc" | grep -q "\"ok\": false"
  echo "$doc" | grep -q "cliVersion"
  echo "$doc" | grep -q "install.sh"
  echo "$doc" | grep -q "builtInPacks"
  echo "$doc" | grep -q "ai-core"
  # Offline: connection errors must be actionable (not a bare "fetch failed")
  msg="$(AI_RADAR_BASE_URL=http://127.0.0.1:1 "$ROOT/bin/ai-radar" health 2>&1 || true)"
  echo "$msg" | grep -qi "Cannot reach backend"
  echo "$msg" | grep -qi "install.sh"
' _ "$ROOT"

echo
if [[ "$fail" -eq 0 ]]; then
  echo "All checks passed."
  exit 0
fi
echo "Some checks failed."
exit 1
