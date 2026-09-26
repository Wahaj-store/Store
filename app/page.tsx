import { prisma } from '@/lib/prisma';
import Store from '@/components/Store';

export const revalidate = 0; // ضمان تحديث البيانات بشكل فوري

export default async function Page() {
  // جلب كافة بيانات المتجر من قاعدة البيانات بشكل متزامن لتحسين الأداء
  const [sections, products, categories, settings, theme, payments, offers] = await Promise.all([
    prisma.homepageSection.findMany({
      where: { visible: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
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
      }}
    />
  );
}
