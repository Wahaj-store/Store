import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [sections, products, categories, settings, theme, payments, offers] = await Promise.all([
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
  ]);

  return NextResponse.json({
    sections,
    products,
    categories,
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    theme,
    payments,
    offers,
  });
}
