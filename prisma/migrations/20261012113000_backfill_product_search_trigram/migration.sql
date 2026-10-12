CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_searchText_idx"
  ON "Product" USING GIN ("searchText" gin_trgm_ops);

WITH normalized_products AS (
  SELECT
    p."id",
    btrim(
      regexp_replace(
        translate(
          replace(
            regexp_replace(
              lower(concat_ws(' ', p."name", p."slug", p."sku", p."description", p."tags", p."material", p."careInstructions")),
              U&'[\064B-\065F\0670-\06ED]',
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
    ) AS search_text
  FROM "Product" p
)
UPDATE "Product" p
SET "searchText" = normalized_products.search_text
FROM normalized_products
WHERE p."id" = normalized_products."id"
  AND p."searchText" IS DISTINCT FROM normalized_products.search_text;
