#!/usr/bin/env bash
# WAL-safe SQLite backup of the AI Radar database.
# Usage: ./scripts/backup.sh [output-dir]
#   default output: data/backups/radar-YYYYmmdd-HHMMSS.db
#   keeps the last BACKUP_KEEP (default 14) backups.
#   AI_RADAR_DB overrides DB path (e.g. backend/data/radar.db when Maven CWD differs).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${AI_RADAR_DB:-$ROOT/data/radar.db}"
OUT_DIR="${1:-$ROOT/data/backups}"
KEEP="${BACKUP_KEEP:-14}"
# Trim so " 14 " is valid; whitespace-only still falls back below.
KEEP="${KEEP#"${KEEP%%[![:space:]]*}"}"
KEEP="${KEEP%"${KEEP##*[![:space:]]}"}"
if ! [[ "$KEEP" =~ ^[0-9]+$ ]] || [[ "$KEEP" -lt 1 ]]; then
  echo "NOTE: BACKUP_KEEP='$KEEP' invalid — using 14" >&2
  KEEP=14
fi

# When AI_RADAR_DB is unset and install.sh never wrote root data/, try Maven CWD path.
if [[ -z "${AI_RADAR_DB:-}" && ! -f "$DB" && -f "$ROOT/backend/data/radar.db" ]]; then
  DB="$ROOT/backend/data/radar.db"
  echo "NOTE: using Maven DB path $DB (set AI_RADAR_DB to override)" >&2
fi

if [[ ! -f "$DB" ]]; then
  echo "ERROR: database not found: $DB" >&2
  echo "Start the app first (./install.sh) or set AI_RADAR_DB." >&2
  echo "Note: Maven from backend/ writes backend/data/radar.db — e.g. AI_RADAR_DB=backend/data/radar.db" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
STAMP="$(date '+%Y%m%d-%H%M%S')"
DEST="$OUT_DIR/radar-$STAMP.db"

if command -v sqlite3 >/dev/null 2>&1; then
  # Online backup: consistent under WAL even while the backend is writing.
  sqlite3 "$DB" ".backup '$DEST'"
  METHOD="sqlite3 .backup"
else
  # Fallback: copy main db + WAL/SHM. Prefer installing sqlite3 for live backups.
  cp "$DB" "$DEST"
  for suffix in -wal -shm; do
    if [[ -f "${DB}${suffix}" ]]; then
      cp "${DB}${suffix}" "${DEST}${suffix}"
    fi
  done
  METHOD="cp (install sqlite3 for live-safe backups)"
fi

SIZE="$(du -h "$DEST" | awk '{print $1}')"
echo "OK  backup  $DEST  ($SIZE via $METHOD)"

# Prune old backups (portable; no mapfile — macOS ships bash 3.2)
count=0
# shellcheck disable=SC2012
for f in $(ls -1t "$OUT_DIR"/radar-*.db 2>/dev/null); do
  count=$((count + 1))
  if [[ $count -gt $KEEP ]]; then
    rm -f "$f" "${f}-wal" "${f}-shm"
    echo "pruned  $f"
  fi
done

echo "Restore: stop the backend, then"
echo "  cp '$DEST' '$DB'   # or: sqlite3 '$DB' \".restore '$DEST'\""
