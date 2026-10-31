import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const productId = params.get('productId')?.trim();
  if (!productId) return NextResponse.json([]);

  const requestedLimit = Number(params.get('limit'));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const cursorId = params.get('cursor')?.trim() || null;

  let cursorReview: { id: string; createdAt: Date } | null = null;
  if (cursorId) {
    cursorReview = await prisma.review.findFirst({
      where: { id: cursorId, productId, approved: true },
      select: { id: true, createdAt: true },
    });
    if (!cursorReview) {
      return NextResponse.json({ error: 'مؤشر صفحة التقييمات غير صالح' }, { status: 400 });
    }
  }

  const cursorWhere = cursorReview
    ? {
        OR: [
          { createdAt: { lt: cursorReview.createdAt } },
          { createdAt: cursorReview.createdAt, id: { lt: cursorReview.id } },
        ],
      }
    : {};
  const rows = await prisma.review.findMany({
    where: { productId, approved: true, ...cursorWhere },
    select: {
      id: true,
      rating: true,
      text: true,
      imageUrl: true,
      verified: true,
      createdAt: true,
      customer: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const reviews = hasMore ? rows.slice(0, limit) : rows;
  const headers = new Headers({
    'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    'X-Has-More': String(hasMore),
    'X-Page-Limit': String(limit),
  });
  if (hasMore && reviews.length > 0) {
    headers.set('X-Next-Cursor', reviews[reviews.length - 1].id);
  }

  // Keep the legacy array response shape; clients can request the next page
  // using the cursor response header without breaking existing consumers.
  return NextResponse.json(reviews, { headers });
}
