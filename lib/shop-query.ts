import { normalizeProductSearchText } from '@/lib/product-search';
import type { ShopFilters } from '@/lib/shop-data';

export type ShopSort = ShopFilters['sort'];
export type ShopSearchState = {
  q: string;
  category: string | null;
  rawMinPrice: string;
  rawMaxPrice: string;
  minPrice: number | null;
  maxPrice: number | null;
  invalidPriceRange: boolean;
  inStock: boolean;
  sort: ShopSort;
  page: number;
  filters: ShopFilters;
};

export type RawShopSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getNonNegativeNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseShopSearchParams(params: RawShopSearchParams): ShopSearchState {
  const q = (first(params.q) || '').trim().slice(0, 120);
  const normalizedQuery = normalizeProductSearchText(q);
  const category = first(params.category)?.trim().slice(0, 120) || null;
  const rawMinPrice = first(params.minPrice) || '';
  const rawMaxPrice = first(params.maxPrice) || '';
  const parsedMinPrice = getNonNegativeNumber(rawMinPrice);
  const parsedMaxPrice = getNonNegativeNumber(rawMaxPrice);
  const invalidPriceRange = parsedMinPrice !== null && parsedMaxPrice !== null && parsedMinPrice > parsedMaxPrice;
  const pageValue = Number(first(params.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? Math.min(pageValue, 100_000) : 1;
  const sortValue = first(params.sort);
  const sort: ShopSort = ['newest', 'price-asc', 'price-desc', 'name-asc'].includes(sortValue || '')
    ? (sortValue as ShopSort)
    : 'newest';
  const inStock = first(params.stock) === 'in-stock';

  const minPrice = invalidPriceRange ? null : parsedMinPrice;
  const maxPrice = invalidPriceRange ? null : parsedMaxPrice;
  const filters: ShopFilters = {
    q: normalizedQuery || null,
    category,
    minPrice,
    maxPrice,
    inStock,
    sort,
  };

  return {
    q,
    category,
    rawMinPrice,
    rawMaxPrice,
    minPrice: parsedMinPrice,
    maxPrice: parsedMaxPrice,
    invalidPriceRange,
    inStock,
    sort,
    page,
    filters,
  };
}

export function shopHref(
  state: ShopSearchState,
  changes: Partial<Record<'q' | 'category' | 'minPrice' | 'maxPrice' | 'stock' | 'sort' | 'page', string | null>> = {},
) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.minPrice !== null && !state.invalidPriceRange) params.set('minPrice', String(state.minPrice));
  if (state.maxPrice !== null && !state.invalidPriceRange) params.set('maxPrice', String(state.maxPrice));
  if (state.inStock) params.set('stock', 'in-stock');
  if (state.sort !== 'newest') params.set('sort', state.sort);

  // Any filter change resets pagination; callers may override it explicitly.
  if (changes.page !== undefined) {
    if (changes.page) params.set('page', changes.page);
  }
  for (const key of ['q', 'category', 'minPrice', 'maxPrice', 'stock', 'sort'] as const) {
    if (changes[key] === undefined) continue;
    const value = changes[key];
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
  }

  const query = params.toString();
  return query ? `/shop?${query}` : '/shop';
}
