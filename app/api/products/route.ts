import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeArabic } from '@/lib/security';

const PAGE_SIZE = 24;

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('q') || '').trim().slice(0, 120);
  const q = normalizeArabic(raw);
  const category = searchParams.get('category')?.trim() || undefined;
  const page = positiveInt(searchParams.get('page'), 1);
  const minPrice = nonNegativeNumber(searchParams.get('minPrice'));
  const maxPrice = nonNegativeNumber(searchParams.get('maxPrice'));
  const inStock = searchParams.get('stock') === 'in-stock';
  const sortParam = searchParams.get('sort');
  const sort = ['newest', 'price-asc', 'price-desc', 'name-asc'].includes(sortParam || '') ? sortParam! : 'newest';

  const where = {
    status: 'PUBLISHED' as const,
    ...(category ? { category: { slug: category } } : {}),
    ...(raw
      ? {
          OR: [
            { name: { contains: raw, mode: 'insensitive' as const } },
            { sku: { contains: raw, mode: 'insensitive' as const } },
            { description: { contains: raw, mode: 'insensitive' as const } },
            { tags: { contains: raw, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(inStock ? { stock: { gt: 0 } } : {}),
  };

  const orderBy =
    sort === 'price-asc'
      ? { price: 'asc' as const }
      : sort === 'price-desc'
        ? { price: 'desc' as const }
        : sort === 'name-asc'
          ? { name: 'asc' as const }
          : { createdAt: 'desc' as const };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true, variants: true },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // Keep the existing Arabic-normalized matching behavior for the current page,
  // while pagination itself is handled by the database.
  const filtered = raw
    ? products.filter((p) => [p.name, p.sku, p.description || '', p.tags || ''].some((v) => normalizeArabic(v).includes(q)))
    : products;

  return NextResponse.json({
    items: filtered,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
    filters: { q: raw, category, minPrice, maxPrice, inStock, sort },
  });
}
