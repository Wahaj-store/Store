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
 * Must remain aligned with normalize_product_search_text() in the database
 * trigger migration. The normalized value is indexed by PostgreSQL pg_trgm.
 */
export function normalizeProductSearchText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    // Arabic harakat, dagger alif and Quranic annotation marks (not Arabic letters).
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
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
