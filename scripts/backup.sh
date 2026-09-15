#!/usr/bin/env bash
# WAL-safe SQLite backup of the AI Radar database.
# Usage: ./scripts/backup.sh [output-dir]
#   default output: data/backups/radar-YYYYmmdd-HHMMSS.db
#   keeps the 14 most recent backups.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${AI_RADAR_DB:-$ROOT/data/radar.db}"
OUT_DIR="${1:-$ROOT/data/backups}"
KEEP="${BACKUP_KEEP:-14}"

if [[ ! -f "$DB" ]]; then
  echo "ERROR: database not found: $DB" >&2
  echo "Start the app first (./install.sh) or set AI_RADAR_DB." >&2
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
