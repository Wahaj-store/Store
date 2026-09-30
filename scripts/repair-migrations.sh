#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f prisma/schema.prisma ]]; then
  echo "ERROR: prisma/schema.prisma not found. Run this from the project root." >&2
  exit 1
fi

if ! grep -q 'searchText' prisma/schema.prisma; then
  echo "ERROR: prisma/schema.prisma does not contain Product.searchText." >&2
  exit 1
fi

echo "[1/4] Validating Prisma schema..."
npx prisma validate

echo "[2/4] Removing the broken Phase 09 migration only..."
rm -rf prisma/migrations/20260929163000_product_search_text
rm -rf prisma/migrations/00000000000000_baseline
mkdir -p prisma/migrations/00000000000000_baseline

echo "[3/4] Generating a baseline migration from the CURRENT schema..."
tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$tmp_sql"

{
  echo 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
  cat "$tmp_sql"
} > prisma/migrations/00000000000000_baseline/migration.sql

rm -f "$tmp_sql"
trap - EXIT

echo "[4/4] Checking the generated migration..."
if ! grep -q 'CREATE TABLE "Product"' prisma/migrations/00000000000000_baseline/migration.sql; then
  echo "ERROR: baseline does not contain Product. Migration was NOT completed." >&2
  exit 1
fi
if ! grep -q 'Product_searchText_idx' prisma/migrations/00000000000000_baseline/migration.sql; then
  echo "ERROR: baseline does not contain the search index. Migration was NOT completed." >&2
  exit 1
fi

echo
printf '%s\n' 'Migration repair prepared successfully.'
printf '%s\n' 'Next command: npx prisma migrate deploy'
printf '%s\n' 'DO NOT run prisma migrate reset.'
