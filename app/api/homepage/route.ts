import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const [sections, products, categories, settings, theme, payments, offers, testimonials] = await Promise.all([
    prisma.homepageSection.findMany({
      where: {
        visible: true,
        status: 'PUBLISHED',
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: { images: { orderBy: { sortOrder: 'asc' } }, category: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.siteSetting.findMany(),
    prisma.themeSetting.findFirst(),
    prisma.paymentSetting.findMany({
      where: { enabled: true },
      select: {
        method: true,
        enabled: true,
        label: true,
        description: true,
        iconKey: true,
        accountName: true,
        accountNumber: true,
        instructions: true,
        proofRequired: true,
        displayOrder: true,
      },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.offer.findMany({
      where: {
        active: true,
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.findMany({
      where: { approved: true, text: { not: null }, product: { is: { status: 'PUBLISHED' } } },
      select: {
        id: true,
        rating: true,
        text: true,
        verified: true,
        customer: { select: { name: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    sections,
    products,
    categories,
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    theme,
    payments,
    offers,
    testimonials: testimonials.map((review) => ({
      id: review.id,
      rating: review.rating,
      text: review.text,
      verified: review.verified,
      customerName: String(review.customer.name || '').trim().split(/\s+/)[0] || 'عميلة وَهَج',
      productName: review.product.name,
      productSlug: review.product.slug,
    })),
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
