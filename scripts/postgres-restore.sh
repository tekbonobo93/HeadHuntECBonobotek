#!/bin/sh
set -eu

if [ -z "${TARGET_DATABASE_URL:-}" ]; then
  echo "TARGET_DATABASE_URL is required."
  exit 1
fi

if [ -z "${BACKUP_FILE:-}" ]; then
  echo "BACKUP_FILE is required."
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$TARGET_DATABASE_URL" \
  "$BACKUP_FILE"

psql "$TARGET_DATABASE_URL" -c "SELECT version, file_name, applied_at FROM schema_migrations ORDER BY version;"
echo "Restore completed and schema_migrations verified."
