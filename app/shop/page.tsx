import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';

export const revalidate = 0;

export default async function Shop({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const q = searchParams.q || '';
  const category = searchParams.category;

  const ps = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      ...(category ? { category: { slug: category } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const cats = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <main className="wahaj-shop-page container section" dir="rtl">
      <div className="wahaj-shop-page__hero">
        <span className="inline-block text-[var(--gold)] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[var(--gold)]/10 mb-3">
          Wahaj Store
        </span>
        <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">المتجر</h1>
        <p className="text-muted-foreground text-sm md:text-base mt-2 font-light">
          اكتشفي تشكيلتنا الواسعة المصممة خصيصاً لتمنحك إطلالة فريدة ومميزة.
        </p>
        
        <form className="mt-8 flex gap-3 max-w-xl">
          <input
            name="q"
            defaultValue={q}
            className="flex-1 rounded-2xl border border-border/60 bg-[var(--bg)] px-5 py-3.5 text-sm outline-none focus:border-[var(--gold)] transition-colors shadow-sm"
            placeholder="ابحثي عن منتج أو SKU..."
          />
          <button className="rounded-2xl bg-[var(--gold)] text-[var(--gold-contrast)] font-semibold px-7 py-3.5 text-sm hover:opacity-95 transition-opacity shadow-md cursor-pointer">
            بحث
          </button>
        </form>
      </div>

      <div className="wahaj-shop-page__filters">
        <a
          href="/shop"
          className={`rounded-full px-5 py-2.5 text-xs font-medium transition-all ${
            !category
              ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-sm'
              : 'border border-border/60 hover:border-[var(--gold)] text-foreground/80'
          }`}
        >
          الكل
        </a>
        {cats.map((c) => (
          <a
            key={c.id}
            href={`/shop?category=${c.slug}`}
            className={`rounded-full px-5 py-2.5 text-xs font-medium transition-all ${
              category === c.slug
                ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold shadow-sm'
                : 'border border-border/60 hover:border-[var(--gold)] text-foreground/80'
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <div className="wahaj-product-grid mt-10">
        {ps.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {!ps.length && (
        <div className="lux-card mt-16 p-12 text-center rounded-3xl border border-border/40 shadow-sm">
          <p className="text-muted-foreground font-light">لا توجد منتجات مطابقة لبحثك.</p>
        </div>
      )}
    </main>
  );
}
