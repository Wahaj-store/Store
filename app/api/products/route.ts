import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  buildPublicProductsOrder,
  buildPublicProductsWhere,
  parsePublicProductsQuery,
  PUBLIC_PRODUCT_LIST_SELECT,
  PUBLIC_PRODUCTS_PAGE_SIZE,
} from '@/lib/public-products-query';

export async function GET(req: Request) {
  const query = parsePublicProductsQuery(new URL(req.url).searchParams);
  const where = buildPublicProductsWhere(query);
  const orderBy = buildPublicProductsOrder(query.sort);

  // Count and page now use the exact same database predicate. This keeps
  // pagination totals consistent with search results and avoids JS filtering.
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: PUBLIC_PRODUCT_LIST_SELECT,
      orderBy,
      skip: (query.page - 1) * PUBLIC_PRODUCTS_PAGE_SIZE,
      take: PUBLIC_PRODUCTS_PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    items: products,
    pagination: {
      page: query.page,
      pageSize: PUBLIC_PRODUCTS_PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PUBLIC_PRODUCTS_PAGE_SIZE)),
    },
    filters: {
      q: query.rawQuery,
      category: query.category,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock,
      sort: query.sort,
    },
  });
}
