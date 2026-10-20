import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const SHOP_PAGE_SIZE = 12;
export const SHOP_PRODUCTS_CACHE_TAG = 'shop-products';
export const SHOP_CATEGORIES_CACHE_TAG = 'shop-categories';
export const SHOP_RESULTS_REVALIDATE_SECONDS = 15;

type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

export type ShopFilters = {
  q: string | null;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  sort: ProductSort;
};

type ShopCountFilters = Pick<ShopFilters, 'q' | 'category' | 'minPrice' | 'maxPrice' | 'inStock'>;
type ShopWhereFilters = ShopCountFilters;

export type ShopPageQuery = {
  filters: ShopFilters;
  page: number;
};

export type ShopCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  newArrival: boolean;
  bestSeller: boolean;
  images: { url: string; alt: string | null }[];
  category: { name: string };
  variants: { id: string; stock: number }[];
};

function productWhere(filters: ShopWhereFilters): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput[] = [{ status: 'PUBLISHED' }];

  if (filters.category) {
    conditions.push({ category: { is: { slug: filters.category } } });
  }
  if (filters.q) {
    // searchText is lower-cased and normalized on write by a database trigger.
    // This single contains predicate can use the PostgreSQL pg_trgm GIN index.
    conditions.push({ searchText: { contains: filters.q } });
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    conditions.push({
      price: {
        ...(filters.minPrice !== null ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== null ? { lte: filters.maxPrice } : {}),
      },
    });
  }
  if (filters.inStock) {
    conditions.push({
      OR: [
        { stock: { gt: 0 } },
        { variants: { some: { stock: { gt: 0 } } } },
      ],
    });
  }

  return { AND: conditions };
}

function productOrder(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
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

const readActiveCategories = unstable_cache(
  async (): Promise<ShopCategory[]> => prisma.category.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  }),
  ['shop-active-categories-v1'],
  { revalidate: 300, tags: [SHOP_CATEGORIES_CACHE_TAG] },
);

export function getShopCategories() {
  return readActiveCategories();
}

const readShopCount = unstable_cache(
  async (filters: ShopCountFilters): Promise<number> => prisma.product.count({ where: productWhere(filters) }),
  ['shop-product-count-v2'],
  { revalidate: SHOP_RESULTS_REVALIDATE_SECONDS, tags: [SHOP_PRODUCTS_CACHE_TAG] },
);

export function getShopProductCount(filters: ShopFilters) {
  const countFilters: ShopCountFilters = {
    q: filters.q,
    category: filters.category,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    inStock: filters.inStock,
  };
  return readShopCount(countFilters);
}

const readShopProducts = unstable_cache(
  async ({ filters, page }: ShopPageQuery): Promise<ShopProduct[]> => {
    const where = productWhere(filters);
    const select = {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      comparePrice: true,
      stock: true,
      newArrival: true,
      bestSeller: true,
      images: {
        select: { url: true, alt: true },
        orderBy: { sortOrder: 'asc' as const },
        take: 1,
      },
      category: { select: { name: true } },
      // Cards need only to know whether variants exist; option data loads on detail.
      variants: { select: { id: true, stock: true }, orderBy: { stock: 'desc' }, take: 1 },
    } satisfies Prisma.ProductSelect;
    const orderBy = productOrder(filters.sort);
    const skip = (page - 1) * SHOP_PAGE_SIZE;

    let rows = await prisma.product.findMany({
      where,
      select,
      orderBy,
      skip,
      take: SHOP_PAGE_SIZE,
    });

    // Keep stale/out-of-range bookmarked URLs useful without delaying ordinary pages.
    if (rows.length === 0 && page > 1) {
      const total = await prisma.product.count({ where });
      const lastPage = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
      if (page > lastPage) {
        rows = await prisma.product.findMany({
          where,
          select,
          orderBy,
          skip: (lastPage - 1) * SHOP_PAGE_SIZE,
          take: SHOP_PAGE_SIZE,
        });
      }
    }

    // Return plain, small objects to the Next.js data cache and client-card boundary.
    return rows.map((product) => ({
      ...product,
      price: Number(product.price),
      comparePrice: product.comparePrice === null ? null : Number(product.comparePrice),
    }));
  },
  ['shop-product-page-v2'],
  { revalidate: SHOP_RESULTS_REVALIDATE_SECONDS, tags: [SHOP_PRODUCTS_CACHE_TAG] },
);

export function getShopProducts(query: ShopPageQuery) {
  return readShopProducts(query);
}
