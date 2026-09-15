#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PID_FILE="data/ai-radar.pid"
TRANSLATE_PID_FILE="data/argos-translate.pid"

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

stop_pid_file() {
  local file=$1
  local label=$2
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  local pid
  pid="$(tr -d '[:space:]' < "$file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "==> Stopping $label (PID $pid)…"
    kill_tree "$pid"
    for _ in 1 2 3 4 5; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$pid" 2>/dev/null; then
      echo "Process still running; sending SIGKILL…"
      kill -9 "$pid" 2>/dev/null || true
      children="$(pgrep -P "$pid" 2>/dev/null || true)"
      for child in $children; do
        kill -9 "$child" 2>/dev/null || true
      done
    fi
    rm -f "$file"
    return 0
  fi
  echo "PID file present but $label process $pid is not running."
  rm -f "$file"
  return 1
}

stopped=0

if stop_pid_file "$PID_FILE" "AI Radar"; then
  stopped=1
else
  if [[ ! -f "$PID_FILE" ]]; then
    echo "No PID file at $PID_FILE."
  fi
fi

if stop_pid_file "$TRANSLATE_PID_FILE" "Argos Translate"; then
  stopped=1
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

  TRANSLATE_PIDS="$(lsof -tiTCP:8765 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$TRANSLATE_PIDS" ]]; then
    echo "==> Freeing port 8765 (PIDs: $TRANSLATE_PIDS)…"
    # shellcheck disable=SC2086
    kill $TRANSLATE_PIDS 2>/dev/null || true
    sleep 1
    TRANSLATE_PIDS="$(lsof -tiTCP:8765 -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$TRANSLATE_PIDS" ]]; then
      # shellcheck disable=SC2086
      kill -9 $TRANSLATE_PIDS 2>/dev/null || true
    fi
    stopped=1
  fi
fi

if [[ "$stopped" -eq 1 ]]; then
  echo "AI Radar stopped."
else
  echo "Nothing to stop."
fi
