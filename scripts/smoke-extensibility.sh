#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${AI_RADAR_BASE_URL:-http://127.0.0.1:8080}"

echo "== health =="
curl -sf "$BASE/api/health" | head -c 200
echo

echo "== ensure fixture source =="
curl -sf -X POST "$BASE/api/sources" -H 'Content-Type: application/json' -d '{
  "name":"Demo Event Fixture",
  "type":"FIXTURE",
  "enabled":true,
  "config":{"path":"fixtures/demo-events.json"}
}' >/dev/null || true

echo "== fetch =="
curl -sf -X POST "$BASE/api/jobs/fetch" | head -c 300
echo

echo "== cluster =="
curl -sf -X POST "$BASE/api/jobs/cluster" | head -c 300
echo

echo "== events =="
curl -sf "$BASE/api/events?limit=5" | head -c 400
echo

echo "== push (outbox) =="
curl -sf -X POST "$BASE/api/jobs/push" | head -c 400
echo

if ls "$ROOT/data/outbox"/*.json >/dev/null 2>&1 || ls "$ROOT/backend/data/outbox"/*.json >/dev/null 2>&1; then
  echo "OK: outbox file present"
else
  echo "WARN: no outbox file found under data/outbox (is outbox delivery enabled?)"
fi

echo "== intelligence home =="
curl -sf "$BASE/api/intelligence/home" | head -c 300
echo
echo "smoke-extensibility done"
