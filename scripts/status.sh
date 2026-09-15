#!/usr/bin/env bash
# Quick health snapshot for local AI Radar processes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKEND_URL="${AI_RADAR_BASE_URL:-http://127.0.0.1:8080}"
TRANSLATE_URL="${RADAR_TRANSLATE_URL:-http://127.0.0.1:8765}"

ok=0
warn=0
fail=0

note() { printf '  %s\n' "$*"; }
pass() { ok=$((ok + 1)); printf 'OK   %s\n' "$1"; note "$2"; }
soft() { warn=$((warn + 1)); printf 'WARN %s\n' "$1"; note "$2"; }
bad()  { fail=$((fail + 1)); printf 'DOWN %s\n' "$1"; note "$2"; }

echo "AI Radar status — $(date '+%Y-%m-%d %H:%M:%S')"
echo

# --- backend ---
BACKEND_BODY=""
if BACKEND_BODY="$(curl -fsS --max-time 2 "$BACKEND_URL/api/health" 2>/dev/null)"; then
  pass "backend  $BACKEND_URL" "$BACKEND_BODY"
  UI_HINT="$BACKEND_URL"
else
  bad "backend  $BACKEND_URL" "not responding. Start: ./install.sh  or  cd backend && ./mvnw spring-boot:run"
  UI_HINT="http://localhost:8080 (after start)"
fi

# --- llm (what actually scores & summarizes) ---
llm_line=""
if [[ -n "$BACKEND_BODY" ]] && command -v python3 >/dev/null 2>&1; then
  llm_line="$(printf '%s' "$BACKEND_BODY" | python3 -c '
import json,sys
l=json.load(sys.stdin).get("llm") or {}
print("\t".join(str(l.get(k) if l.get(k) is not None else "") for k in
                 ("mode","model","baseUrl","lastError")))
' 2>/dev/null || true)"
fi
if [[ -n "$llm_line" ]]; then
  IFS=$'\t' read -r llm_mode llm_model llm_url llm_err <<<"$llm_line"
  if [[ "$llm_mode" == "heuristic" ]]; then
    soft "llm      ${llm_model:-unset}" "rules mode (no usable endpoint / API key). Configure in Settings → AI model"
  elif [[ -z "$llm_mode" ]]; then
    :
  else
    # Config alone is not proof — a localhost URL reads as "ready" with nothing listening — and a
    # cached success goes stale the moment the endpoint dies. This is a diagnostic command, so
    # always verify against the live endpoint and report the observed result.
    probe=""
    probe="$(curl -fsS --max-time 8 "$BACKEND_URL/api/health/llm" 2>/dev/null \
      | python3 -c 'import json,sys
d=json.load(sys.stdin)
print(("ok" if d.get("ok") else "fail") + "\t" + str(d.get("error") or ""))' 2>/dev/null || true)"
    IFS=$'\t' read -r probe_state probe_err <<<"$probe"
    if [[ "$probe_state" == "ok" ]]; then
      pass "llm      ${llm_model:-model}" "reachable at ${llm_url:-?} (verified now)"
    elif [[ -n "$probe_state" ]]; then
      soft "llm      ${llm_model:-model}" "configured but NOT reachable — scoring/summaries use rules. ${probe_err:-probe failed}"
    else
      soft "llm      ${llm_model:-model}" "could not verify (probe did not respond). Last known: ${llm_err:-no calls yet}"
    fi
  fi
fi

# --- translate (prefer backend-reported status when available) ---
translate_status=""
if [[ -n "$BACKEND_BODY" ]] && command -v python3 >/dev/null 2>&1; then
  translate_status="$(printf '%s' "$BACKEND_BODY" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("translate",{}).get("status",""))' 2>/dev/null || true)"
fi
case "$translate_status" in
  up)
    pass "translate $TRANSLATE_URL" "reported up by backend (en→zh titles)"
    ;;
  disabled)
    soft "translate $TRANSLATE_URL" "disabled in config — titles stay English"
    ;;
  *)
    if curl -fsS --max-time 2 "$TRANSLATE_URL/health" >/dev/null 2>&1; then
      pass "translate $TRANSLATE_URL" "Argos sidecar healthy (en→zh titles)"
    else
      soft "translate $TRANSLATE_URL" "down — titles stay English. Start via ./install.sh or see translate-service/README.md"
    fi
    ;;
esac

# --- pid files ---
for pair in "backend:data/ai-radar.pid:data/ai-radar.log" "translate:data/argos-translate.pid:data/argos-translate.log"; do
  IFS=':' read -r label pidf logf <<<"$pair"
  if [[ -f "$pidf" ]]; then
    pid="$(tr -d '[:space:]' < "$pidf" || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      pass "$label pid" "PID $pid · log: $logf"
    else
      soft "$label pid" "stale $pidf (process not running). Stop cleanup: ./stop.sh"
    fi
  fi
done

# --- ports still held without pid files ---
if command -v lsof >/dev/null 2>&1; then
  for port in 8080 8765; do
    pids="$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      pass "port $port" "listening (PIDs: $pids)"
    fi
  done
fi

echo
echo "Summary: $ok ok · $warn warn · $fail down"
echo "UI: $UI_HINT"
if [[ "$fail" -gt 0 ]]; then
  echo "Next: ./install.sh   (or SKIP_TRANSLATE=1 ./install.sh for faster start)"
  exit 1
fi
exit 0
