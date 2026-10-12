type SearchableProductFields = {
  name?: unknown;
  slug?: unknown;
  sku?: unknown;
  description?: unknown;
  tags?: unknown;
  material?: unknown;
  careInstructions?: unknown;
};

/**
 * Keep this normalization aligned with the SQL backfill in the trigram migration.
 * The same normalized representation is stored in Product.searchText and queried
 * from /shop so PostgreSQL can use its pg_trgm GIN index for substring matches.
 */
export function normalizeProductSearchText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildProductSearchText(product: SearchableProductFields): string {
  return normalizeProductSearchText([
    product.name,
    product.slug,
    product.sku,
    product.description,
    product.tags,
    product.material,
    product.careInstructions,
  ].filter((value) => value != null && value !== '').join(' '));
}
