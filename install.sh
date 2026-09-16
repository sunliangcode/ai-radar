#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> AI Radar install"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# Major version of the Java on PATH ("1.8.0_x" legacy form included).
java_major_version() {
  local raw first rest
  raw="$(java -version 2>&1 | head -n1 | sed -E 's/.*version "([^"]+)".*/\1/')"
  first="${raw%%.*}"
  if [[ "$first" == "1" ]]; then
    rest="${raw#1.}"
    echo "${rest%%.*}"
  else
    echo "$first"
  fi
}

# Node is only needed to build the UI; Vite 8 requires >= 20.12.
node_supported() {
  local raw major minor
  raw="$(node --version 2>/dev/null || echo '')"
  [[ -n "$raw" ]] || return 1
  major="${raw#v}"
  major="${major%%.*}"
  minor="${raw#v*.}"
  minor="${minor%%.*}"
  [[ "$major" =~ ^[0-9]+$ ]] || return 1
  (( major > 20 )) && return 0
  (( major == 20 && ${minor:-0} >= 12 ))
}

if ! command -v java >/dev/null 2>&1; then
  fail "Java not found. Install JDK 21+ first (see docs/installation.md)."
fi

JAVA_VER="$(java -version 2>&1 | head -n1 || true)"
JAVA_MAJOR="$(java_major_version)"
echo "Java: $JAVA_VER"
if [[ ! "$JAVA_MAJOR" =~ ^[0-9]+$ ]] || (( JAVA_MAJOR < 21 )); then
  fail "AI Radar needs Java 21+ but found major version ${JAVA_MAJOR:-unknown}. Install JDK 21 and re-run."
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "npm not found. The web UI cannot be built without it — install Node 20.12+ (see docs/installation.md), then re-run ./install.sh."
fi
if ! node_supported; then
  fail "Node $(node --version 2>/dev/null || echo 'not found') is too old. Vite 8 needs Node 20.12+."
fi
echo "Node: $(node --version)"

mkdir -p data/briefs backend/data/briefs

if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env — edit OPENAI_API_KEY / FEISHU_WEBHOOK_URL as needed."
fi

# --- Argos Translate sidecar (en→zh titles) ---
TRANSLATE_PID_FILE="data/argos-translate.pid"
TRANSLATE_LOG="data/argos-translate.log"
TRANSLATE_VENV="$ROOT/translate-service/.venv"
TRANSLATE_PY="$TRANSLATE_VENV/bin/python"
TRANSLATE_PIP="$TRANSLATE_VENV/bin/pip"
ARGOS_PIN="1.11.0"

# SKIP_TRANSLATE=1 ./install.sh  — skip sidecar (faster cold start; titles stay EN)
ensure_translate_sidecar() {
  if [[ "${SKIP_TRANSLATE:-0}" == "1" ]]; then
    echo "SKIP_TRANSLATE=1 — skipping Argos Translate sidecar."
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 not found; skipping Argos Translate sidecar (titles stay untranslated)."
    echo "Install Python 3.10+ and re-run, or see translate-service/README.md"
    return 0
  fi

  # Already healthy? nothing to do.
  if curl -fsS --max-time 1 "http://127.0.0.1:8765/health" >/dev/null 2>&1; then
    echo "Argos Translate already healthy on :8765 — skip install."
    return 0
  fi

  if [[ ! -x "$TRANSLATE_PY" ]]; then
    echo "Creating translate-service venv…"
    python3 -m venv "$TRANSLATE_VENV"
  fi

  local installed=""
  installed="$("$TRANSLATE_PY" -c "import importlib.metadata as m; print(m.version('argostranslate'))" 2>/dev/null || true)"
  if [[ "$installed" == "$ARGOS_PIN" ]]; then
    echo "argostranslate==$ARGOS_PIN already in venv — skip pip."
  else
    echo "Installing argostranslate==$ARGOS_PIN (first run often 2–5+ min: ctranslate2/spacy wheels)…"
    # Prefer binary wheels; show progress (no -q) so it does not look hung.
    "$TRANSLATE_PIP" install --upgrade "pip>=24" >/dev/null
    "$TRANSLATE_PIP" install -r translate-service/requirements.txt
  fi

  # Titles use MiniSBD + stanza stub; drop real stanza/torch (pyenv without _lzma).
  echo "Removing optional stanza/torch (not needed for title translation)…"
  "$TRANSLATE_PIP" uninstall -y stanza torch >/dev/null 2>&1 || true

  echo "Ensuring translate-en_zh model…"
  ARGOS_CHUNK_TYPE=MINISBD ARGOS_STANZA_AVAILABLE=0 \
    "$TRANSLATE_PY" translate-service/install_model.py

  if [[ -f "$TRANSLATE_PID_FILE" ]]; then
    local old_pid
    old_pid="$(tr -d '[:space:]' < "$TRANSLATE_PID_FILE" || true)"
    if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
      echo "Argos Translate already running (PID $old_pid)."
      return 0
    fi
    rm -f "$TRANSLATE_PID_FILE"
  fi

  echo "Starting Argos Translate sidecar…"
  (
    export ARGOS_TRANSLATE_HOST=127.0.0.1
    export ARGOS_TRANSLATE_PORT=8765
    export ARGOS_CHUNK_TYPE=MINISBD
    export ARGOS_STANZA_AVAILABLE=0
    nohup "$TRANSLATE_PY" translate-service/server.py > "$TRANSLATE_LOG" 2>&1 &
    echo $! > "$TRANSLATE_PID_FILE"
  )
  echo "Argos Translate PID $(cat "$TRANSLATE_PID_FILE"). Log: $TRANSLATE_LOG"
}

build_frontend() {
  # A missing npm must be fatal: static assets are gitignored, so without this build there is no UI
  # at all and the old "API-only mode" success path left users staring at a blank page.
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found; cannot build the web UI."
    return 1
  fi
  if [[ ! -d frontend/node_modules ]]; then
    echo "Installing frontend deps…"
    (cd frontend && npm install)
  fi
  echo "Building frontend into Spring static…"
  (cd frontend && npm run build:embed)
}

# Run translate setup and frontend build in parallel (biggest win on first install).
ensure_translate_sidecar &
TRANSLATE_JOB=$!
build_frontend &
FRONTEND_JOB=$!

translate_status=0
frontend_status=0
wait "$TRANSLATE_JOB" || translate_status=$?
wait "$FRONTEND_JOB" || frontend_status=$?

if [[ "$translate_status" -ne 0 ]]; then
  echo "WARNING: Argos Translate setup failed (exit $translate_status). Backend will start; titles fall back to English."
  echo "  See $TRANSLATE_LOG or re-run without SKIP_TRANSLATE. Details: translate-service/README.md"
fi
if [[ "$frontend_status" -ne 0 ]]; then
  echo "ERROR: frontend build failed (exit $frontend_status)."
  exit "$frontend_status"
fi

echo "Starting backend (background)…"
(
  cd backend
  nohup ./mvnw -q spring-boot:run > ../data/ai-radar.log 2>&1 &
  echo $! > ../data/ai-radar.pid
)

HEALTH_URL="http://127.0.0.1:8080/api/health"
echo -n "Waiting for backend health"
ready=0
for _ in $(seq 1 60); do
  if curl -fsS --max-time 1 "$HEALTH_URL" >/dev/null 2>&1; then
    ready=1
    break
  fi
  echo -n "."
  sleep 1
done
echo

if [[ "$ready" -eq 1 ]]; then
  echo "Backend healthy: $HEALTH_URL"
  echo

  # Verify the LLM instead of leaving the user to discover silent heuristic fallback later.
  llm_report=""
  if command -v python3 >/dev/null 2>&1; then
    llm_report="$(curl -fsS --max-time 6 "http://127.0.0.1:8080/api/health/llm" 2>/dev/null \
      | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("unknown\t\t")
else:
    print("\t".join([("ok" if d.get("ok") else "fail"), str(d.get("baseUrl") or ""), str(d.get("error") or "")]))' 2>/dev/null || true)"
  fi
  if [[ -n "$llm_report" ]]; then
    IFS=$'\t' read -r llm_state llm_url llm_err <<<"$llm_report"
    if [[ "$llm_state" == "ok" ]]; then
      echo "AI model: reachable at ${llm_url:-configured endpoint}"
    else
      echo "WARNING: AI model is NOT reachable — scoring and summaries will use built-in rules."
      echo "  Endpoint: ${llm_url:-not configured}"
      [[ -n "$llm_err" ]] && echo "  Reason:   $llm_err"
      echo "  Fix: start Ollama (ollama serve && ollama pull \${OPENAI_MODEL}) or set OPENAI_API_KEY/OPENAI_BASE_URL in backend/.env"
    fi
    echo
  fi

  cat <<'NEXT'
Next steps
  1. Open http://localhost:8080
  2. Settings -> Context: describe your role and stack (this is what makes items relevant)
  3. Settings -> AI model: use "Test connection" to confirm the LLM responds
  4. Today -> "Update now": fetches signals and recomputes impact automatically
     (re-run ./install.sh later to just refresh; ./scripts/status.sh checks everything)

NEXT
else
  echo "WARNING: backend not healthy yet (PID $(cat data/ai-radar.pid 2>/dev/null || echo '?'))."
  if [[ -f data/ai-radar.log ]]; then
    echo "--- last 20 log lines ---"
    tail -n 20 data/ai-radar.log || true
    echo "-------------------------"
    if grep -q "Migration checksum mismatch" data/ai-radar.log 2>/dev/null; then
      cat <<'FLYWAY'

Flyway baseline changed (common after git pull). Pre-release there is no in-place upgrade:
  1. ./stop.sh
  2. Optional: ./scripts/backup.sh   (uses data/radar.db if present)
  3. rm -f backend/data/radar.db backend/data/radar.db-wal backend/data/radar.db-shm
     rm -f data/radar.db data/radar.db-wal data/radar.db-shm
  4. ./install.sh

See docs/installation.md — "Schema (Flyway)".
FLYWAY
    fi
  fi
  echo "  Re-check later: ./scripts/status.sh"
fi
echo "Translate sidecar: http://127.0.0.1:8765/health (see THIRD_PARTY_NOTICES.md)"
echo "Status anytime: ./scripts/status.sh"
echo "Tips: subsequent ./install.sh skips pip if venv+model exist; SKIP_TRANSLATE=1 for fastest start."
