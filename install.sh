#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> AI Radar install"

if ! command -v java >/dev/null 2>&1; then
  echo "Java not found. Install JDK 21+ first."
  exit 1
fi

JAVA_VER="$(java -version 2>&1 | head -n1 || true)"
echo "Java: $JAVA_VER"

mkdir -p data/briefs backend/data/briefs

if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env — edit OPENAI_API_KEY / FEISHU_WEBHOOK_URL as needed."
fi

if [[ ! -d frontend/node_modules ]]; then
  if command -v npm >/dev/null 2>&1; then
    echo "Installing frontend deps…"
    (cd frontend && npm install)
  else
    echo "npm not found; skipping frontend build (API-only mode)."
  fi
fi

if command -v npm >/dev/null 2>&1; then
  echo "Building frontend into Spring static…"
  (cd frontend && npm run build:embed)
fi

echo "Starting backend (background)…"
(
  cd backend
  nohup ./mvnw -q spring-boot:run > ../data/ai-radar.log 2>&1 &
  echo $! > ../data/ai-radar.pid
)

echo "PID $(cat data/ai-radar.pid). Logs: data/ai-radar.log"
echo "Wait a few seconds, then open http://localhost:8080 and GET /api/health"
