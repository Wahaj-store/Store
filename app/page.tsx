import { prisma } from '@/lib/prisma';
import Store from '@/components/Store';

export const revalidate = 0; // ضمان تحديث البيانات بشكل فوري

export default async function Page() {
  // جلب كافة بيانات المتجر من قاعدة البيانات بشكل متزامن لتحسين الأداء
  const [sections, products, categories, settings, theme, payments, offers, testimonials] = await Promise.all([
    prisma.homepageSection.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        category: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.siteSetting.findMany(),
    prisma.themeSetting.findFirst(),
    prisma.paymentSetting.findMany({ where: { enabled: true } }),
    prisma.offer.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
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

  return (
    <Store
      data={{
        sections,
        products: products.map((p) => ({
          ...p,
          price: Number(p.price),
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        })),
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
      }}
    />
  );
}
