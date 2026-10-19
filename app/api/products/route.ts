import { NextResponse } from 'next/server';
import { parsePublicProductsQuery, PUBLIC_PRODUCTS_PAGE_SIZE } from '@/lib/public-products-query';
import { getPublicProductsPage } from '@/lib/public-products-data';

export async function GET(req: Request) {
  const query = parsePublicProductsQuery(new URL(req.url).searchParams);
  const { total, items } = await getPublicProductsPage(query);

  return NextResponse.json({
    items,
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
