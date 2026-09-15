#!/usr/bin/env bash
# End-to-end smoke test for the extensibility path (fixture source -> fetch -> cluster -> push).
#
# Every request is bounded by a timeout: the fetch step runs the whole pipeline (network + LLM per
# item) and used to hang the terminal with no output at all. A slow step now reports progress and
# points at the live progress endpoint instead of blocking forever.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${AI_RADAR_BASE_URL:-http://127.0.0.1:8080}"

# Quick calls get a short budget; the fetch job is allowed much longer (override: SMOKE_FETCH_TIMEOUT).
QUICK_TIMEOUT="${SMOKE_TIMEOUT:-15}"
FETCH_TIMEOUT="${SMOKE_FETCH_TIMEOUT:-180}"
CURL=(curl -sS --connect-timeout 3 --max-time)

say() { echo; echo "== $* =="; }
# Run a request, print at most 300 chars, and never abort the whole smoke run on a slow step.
try() {
  local label="$1" budget="$2"
  shift 2
  local out
  if out="$("${CURL[@]}" "$budget" "$@" 2>&1)"; then
    printf '%s\n' "${out:0:300}"
  else
    echo "FAILED/TIMEOUT ($label after ${budget}s)"
    return 1
  fi
}

say "health"
try health "$QUICK_TIMEOUT" "$BASE/api/health" || true

say "ensure fixture source"
try create-source "$QUICK_TIMEOUT" -X POST "$BASE/api/sources" -H 'Content-Type: application/json' -d '{
  "name":"Demo Event Fixture",
  "type":"FIXTURE",
  "enabled":true,
  "config":{"path":"fixtures/demo-events.json"}
}' || true

say "fetch (runs the full pipeline; up to ${FETCH_TIMEOUT}s)"
echo "Live progress: $BASE/api/jobs/fetch/progress"
if ! try fetch "$FETCH_TIMEOUT" -X POST "$BASE/api/jobs/fetch"; then
  echo "NOTE: the fetch job is still running in the background — check"
  echo "      curl $BASE/api/jobs/fetch/progress   or   ./scripts/status.sh"
fi

say "cluster"
try cluster "$FETCH_TIMEOUT" -X POST "$BASE/api/jobs/cluster" || true

say "events"
try events "$QUICK_TIMEOUT" "$BASE/api/events?limit=5" || true

say "push (outbox)"
try push "$QUICK_TIMEOUT" -X POST "$BASE/api/jobs/push" || true

if ls "$ROOT/data/outbox"/*.json >/dev/null 2>&1 || ls "$ROOT/backend/data/outbox"/*.json >/dev/null 2>&1; then
  echo "OK: outbox file present"
else
  echo "WARN: no outbox file found under data/outbox (is outbox delivery enabled?)"
fi

say "intelligence home"
try home "$QUICK_TIMEOUT" "$BASE/api/intelligence/home" || true

echo
echo "smoke-extensibility done"
