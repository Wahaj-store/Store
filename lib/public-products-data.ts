import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { SHOP_PRODUCTS_CACHE_TAG, SHOP_RESULTS_REVALIDATE_SECONDS } from '@/lib/shop-data';
import {
  buildPublicProductsOrder,
  buildPublicProductsWhere,
  PUBLIC_PRODUCT_LIST_SELECT,
  PUBLIC_PRODUCTS_PAGE_SIZE,
  type PublicProductsQuery,
} from '@/lib/public-products-query';

const readPublicProductsPage = unstable_cache(
  async (query: PublicProductsQuery) => {
    const where = buildPublicProductsWhere(query);
    const orderBy = buildPublicProductsOrder(query.sort);
    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: PUBLIC_PRODUCT_LIST_SELECT,
        orderBy,
        skip: (query.page - 1) * PUBLIC_PRODUCTS_PAGE_SIZE,
        take: PUBLIC_PRODUCTS_PAGE_SIZE,
      }),
    ]);

    return {
      total,
      items: rows.map((product) => ({
        ...product,
        price: Number(product.price),
        comparePrice: product.comparePrice === null ? null : Number(product.comparePrice),
      })),
    };
  },
  ['public-products-api-page-v1'],
  { revalidate: SHOP_RESULTS_REVALIDATE_SECONDS, tags: [SHOP_PRODUCTS_CACHE_TAG] },
);

export function getPublicProductsPage(query: PublicProductsQuery) {
  return readPublicProductsPage(query);
}
