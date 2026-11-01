#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONFIRMATION="YES_REBUILD_LOCAL_PRISMA_BASELINE"
if [[ "${CONFIRM_MIGRATION_REPAIR:-}" != "$CONFIRMATION" ]]; then
  cat >&2 <<MSG
Refusing to rewrite migration files without explicit confirmation.
Review the README migration guidance, then run:
  CONFIRM_MIGRATION_REPAIR=$CONFIRMATION bash scripts/repair-migrations.sh
This script only changes local files; it does not deploy migrations to a database.
MSG
  exit 2
fi

if [[ ! -f prisma/schema.prisma ]]; then
  echo "ERROR: prisma/schema.prisma not found. Run this from the project root." >&2
  exit 1
fi
if ! grep -q 'searchText' prisma/schema.prisma; then
  echo "ERROR: prisma/schema.prisma does not contain Product.searchText." >&2
  exit 1
fi
if [[ ! -f prisma/migrations/migration_lock.toml ]]; then
  echo "ERROR: prisma/migrations/migration_lock.toml not found." >&2
  exit 1
fi

BASELINE="$ROOT/prisma/migrations/00000000000000_baseline"
BROKEN="$ROOT/prisma/migrations/20260929163000_product_search_text"
TMP_DIR="$(mktemp -d "$ROOT/.migration-repair-tmp.XXXXXX")"
BACKUP_DIR=""
REPLACEMENT_STARTED=0

restore_originals() {
  if [[ -n "$BACKUP_DIR" ]]; then
    if [[ ! -e "$BASELINE" && -e "$BACKUP_DIR/baseline.original" ]]; then
      mv "$BACKUP_DIR/baseline.original" "$BASELINE"
    fi
    if [[ ! -e "$BROKEN" && -e "$BACKUP_DIR/product_search_text.original" ]]; then
      mv "$BACKUP_DIR/product_search_text.original" "$BROKEN"
    fi
  fi
}

cleanup() {
  local status=$?
  if (( status != 0 && REPLACEMENT_STARTED == 1 )); then
    restore_originals || echo "WARNING: restore failed; recover files from ${BACKUP_DIR:-the migration repair backup}." >&2
  fi
  rm -rf "$TMP_DIR"
  if [[ -n "$BACKUP_DIR" && -d "$BACKUP_DIR" ]]; then
    printf 'Local migration backup retained at: %s\n' "$BACKUP_DIR"
  fi
  return "$status"
}
trap cleanup EXIT

printf '%s\n' '[1/4] Validating Prisma schema...'
npx prisma validate
printf '%s\n' '[2/4] Generating a replacement baseline in a temporary directory...'
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$TMP_DIR/schema.sql"
mkdir -p "$TMP_DIR/baseline"
{
  echo 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
  cat "$TMP_DIR/schema.sql"
} > "$TMP_DIR/baseline/migration.sql"

printf '%s\n' '[3/4] Validating generated SQL before changing existing migration files...'
if ! grep -q 'CREATE TABLE "Product"' "$TMP_DIR/baseline/migration.sql"; then
  echo 'ERROR: generated baseline does not contain Product. Existing migrations were not changed.' >&2
  exit 1
fi
if ! grep -q 'Product_searchText_idx' "$TMP_DIR/baseline/migration.sql"; then
  echo 'ERROR: generated baseline does not contain the search index. Existing migrations were not changed.' >&2
  exit 1
fi

BACKUP_DIR="$(mktemp -d "$ROOT/.migration-repair-backup.XXXXXX")"
printf '%s\n' '[4/4] Backing up and replacing local migration files...'
REPLACEMENT_STARTED=1
if [[ -e "$BASELINE" ]]; then mv "$BASELINE" "$BACKUP_DIR/baseline.original"; fi
if [[ -e "$BROKEN" ]]; then mv "$BROKEN" "$BACKUP_DIR/product_search_text.original"; fi
if ! mv "$TMP_DIR/baseline" "$BASELINE"; then
  echo 'ERROR: could not install the replacement baseline; attempting to restore the previous files.' >&2
  exit 1
fi
REPLACEMENT_STARTED=0

printf '\n%s\n' 'Local migration repair prepared successfully; no database was contacted.'
printf '%s\n' 'Review the new SQL and retained backup before any deployment.'
printf '%s\n' 'Do not run prisma migrate deploy until you have backed up and verified the target database.'
