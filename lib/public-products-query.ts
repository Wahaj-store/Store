import type { Prisma } from '@prisma/client';
import { normalizeProductSearchText } from '@/lib/product-search';

export const PUBLIC_PRODUCTS_PAGE_SIZE = 12;
export const PUBLIC_PRODUCTS_MAX_PAGE = 1_000;

export type PublicProductsSort = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

export const PUBLIC_PRODUCT_LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  comparePrice: true,
  stock: true,
  featured: true,
  newArrival: true,
  bestSeller: true,
  images: {
    select: { url: true, alt: true },
    orderBy: { sortOrder: 'asc' },
    take: 1,
  },
  category: { select: { name: true } },
  // Variant labels, availability and optional prices power the product-card picker.
  variants: {
    select: { id: true, name: true, value: true, stock: true, price: true, imageUrl: true },
    orderBy: { stock: 'desc' },
  },
} satisfies Prisma.ProductSelect;

export type PublicProductsQuery = {
  rawQuery: string;
  query: string;
  category?: string;
  page: number;
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sort: PublicProductsSort;
};

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parsePublicProductsQuery(searchParams: URLSearchParams): PublicProductsQuery {
  const rawQuery = (searchParams.get('q') || '').trim().slice(0, 120);
  const requestedPage = positiveInt(searchParams.get('page'), 1);
  const sortParam = searchParams.get('sort');
  const allowedSorts: PublicProductsSort[] = ['newest', 'price-asc', 'price-desc', 'name-asc'];

  return {
    rawQuery,
    query: normalizeProductSearchText(rawQuery),
    category: searchParams.get('category')?.trim().slice(0, 100) || undefined,
    page: Math.min(requestedPage, PUBLIC_PRODUCTS_MAX_PAGE),
    minPrice: nonNegativeNumber(searchParams.get('minPrice')),
    maxPrice: nonNegativeNumber(searchParams.get('maxPrice')),
    inStock: searchParams.get('stock') === 'in-stock',
    sort: allowedSorts.includes(sortParam as PublicProductsSort)
      ? (sortParam as PublicProductsSort)
      : 'newest',
  };
}

export function buildPublicProductsWhere(query: PublicProductsQuery): Prisma.ProductWhereInput {
  return {
    status: 'PUBLISHED',
    ...(query.category ? { category: { is: { slug: query.category } } } : {}),
    ...(query.query ? { searchText: { contains: query.query } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          price: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
    ...(query.inStock
      ? {
          OR: [
            { stock: { gt: 0 } },
            { variants: { some: { stock: { gt: 0 } } } },
          ],
        }
      : {}),
  };
}

export function buildPublicProductsOrder(sort: PublicProductsSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }, { id: 'asc' }];
    case 'price-desc':
      return [{ price: 'desc' }, { id: 'desc' }];
    case 'name-asc':
      return [{ name: 'asc' }, { id: 'asc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}
