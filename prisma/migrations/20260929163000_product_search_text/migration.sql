ALTER TABLE "Product" ADD COLUMN "searchText" TEXT;

UPDATE "Product"
SET "searchText" = lower(
  regexp_replace(
    regexp_replace(
      translate(
        coalesce("name", '') || ' ' || coalesce("sku", '') || ' ' || coalesce("description", '') || ' ' || coalesce("tags", ''),
        'إأآٱىؤئة',
        'اااايويه'
      ),
      '[ًٌٍَُِّْـ]', '', 'g'
    ),
    '\\s+', ' ', 'g'
  )
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Product_searchText_idx" ON "Product" USING GIN ("searchText" gin_trgm_ops);
