#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PID_FILE="data/ai-radar.pid"

kill_tree() {
  local pid=$1
  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for child in $children; do
    kill_tree "$child"
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
}

stopped=0

if [[ -f "$PID_FILE" ]]; then
  PID="$(tr -d '[:space:]' < "$PID_FILE")"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "==> Stopping AI Radar (PID $PID)…"
    kill_tree "$PID"
    # Wait briefly for graceful exit, then force if needed
    for _ in 1 2 3 4 5; do
      kill -0 "$PID" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$PID" 2>/dev/null; then
      echo "Process still running; sending SIGKILL…"
      kill -9 "$PID" 2>/dev/null || true
      children="$(pgrep -P "$PID" 2>/dev/null || true)"
      for child in $children; do
        kill -9 "$child" 2>/dev/null || true
      done
    fi
    stopped=1
  else
    echo "PID file present but process $PID is not running."
  fi
  rm -f "$PID_FILE"
else
  echo "No PID file at $PID_FILE."
fi

# Fallback: anything still bound to the app port (Maven child / leftover Java)
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS="$(lsof -tiTCP:8080 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$PORT_PIDS" ]]; then
    echo "==> Freeing port 8080 (PIDs: $PORT_PIDS)…"
    # shellcheck disable=SC2086
    kill $PORT_PIDS 2>/dev/null || true
    sleep 1
    PORT_PIDS="$(lsof -tiTCP:8080 -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$PORT_PIDS" ]]; then
      # shellcheck disable=SC2086
      kill -9 $PORT_PIDS 2>/dev/null || true
    fi
    stopped=1
  fi
fi

if [[ "$stopped" -eq 1 ]]; then
  echo "AI Radar stopped."
else
  echo "Nothing to stop."
fi
