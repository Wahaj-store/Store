-- Keep Product.searchText populated for every write path, not only the admin API.
CREATE OR REPLACE FUNCTION normalize_product_search_text(source_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT btrim(
    regexp_replace(
      translate(
        replace(
          regexp_replace(
            lower(COALESCE(source_text, '')),
            U&'[\064B-\065F\0670\06D6-\06ED]',
            '',
            'g'
          ),
          U&'\0640',
          ''
        ),
        'أإآٱىةؤئ',
        'اااايهوي'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

ALTER TABLE "Product" ALTER COLUMN "searchText" SET DEFAULT '';

UPDATE "Product" AS p
SET "searchText" = normalize_product_search_text(
  concat_ws(' ', p."name", p."slug", p."sku", p."description", p."tags", p."material", p."careInstructions")
)
WHERE p."searchText" IS DISTINCT FROM normalize_product_search_text(
  concat_ws(' ', p."name", p."slug", p."sku", p."description", p."tags", p."material", p."careInstructions")
);

ALTER TABLE "Product" ALTER COLUMN "searchText" SET NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Product_searchText_idx"
  ON "Product" USING GIN ("searchText" gin_trgm_ops);

CREATE OR REPLACE FUNCTION sync_product_search_text()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."searchText" := normalize_product_search_text(
    concat_ws(' ', NEW."name", NEW."slug", NEW."sku", NEW."description", NEW."tags", NEW."material", NEW."careInstructions")
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Product_searchText_sync" ON "Product";
CREATE TRIGGER "Product_searchText_sync"
BEFORE INSERT OR UPDATE OF "name", "slug", "sku", "description", "tags", "material", "careInstructions", "searchText"
ON "Product"
FOR EACH ROW
EXECUTE FUNCTION sync_product_search_text();

-- Match the public catalog's status, sort, category and availability predicates.
CREATE INDEX IF NOT EXISTS "Product_status_createdAt_idx"
  ON "Product" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_categoryId_status_createdAt_idx"
  ON "Product" ("categoryId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_status_price_idx"
  ON "Product" ("status", "price");
CREATE INDEX IF NOT EXISTS "Product_status_name_idx"
  ON "Product" ("status", "name");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_stock_idx"
  ON "ProductVariant" ("productId", "stock");
DROP INDEX IF EXISTS "ProductVariant_productId_idx";
