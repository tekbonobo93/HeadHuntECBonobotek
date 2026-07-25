#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/talentomatch}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_FILE:-$BACKUP_DIR/talentomatch-$TIMESTAMP.dump}"

mkdir -p "$BACKUP_DIR"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE" \
  "$DATABASE_URL"

echo "Backup written to $BACKUP_FILE"
