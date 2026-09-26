import { prisma } from '@/lib/prisma';
import AddToCart from '@/components/AddToCart';

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
    <main className="container py-16" dir="rtl">
      <div className="mb-12">
        <span className="inline-block text-[#D4AF37] text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[#D4AF37]/10 mb-3">
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
            className="flex-1 rounded-2xl border border-border/60 bg-[var(--bg)] px-5 py-3.5 text-sm outline-none focus:border-[#D4AF37] transition-colors shadow-sm"
            placeholder="ابحثي عن منتج أو SKU..."
          />
          <button className="rounded-2xl bg-[#D4AF37] text-black font-semibold px-7 py-3.5 text-sm hover:opacity-95 transition-opacity shadow-md cursor-pointer">
            بحث
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <a
          href="/shop"
          className={`rounded-full px-5 py-2.5 text-xs font-medium transition-all ${
            !category
              ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
              : 'border border-border/60 hover:border-[#D4AF37] text-foreground/80'
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
                ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                : 'border border-border/60 hover:border-[#D4AF37] text-foreground/80'
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {ps.map((p) => {
          const priceNum = Number(p.price);
          const compareNum = p.comparePrice ? Number(p.comparePrice) : 0;
          const discount =
            compareNum > priceNum
              ? Math.round((1 - priceNum / compareNum) * 100)
              : 0;

          return (
            <article
              key={p.id}
              className="group flex flex-col justify-between rounded-3xl border border-border/30 bg-[var(--bg)] p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-[#D4AF37]/50"
            >
              <div>
                <div className="relative overflow-hidden rounded-2xl bg-muted/30 aspect-square">
                  <a href={`/product/${p.slug}`} className="block w-full h-full">
                    <img
                      src={p.images[0]?.url || '/placeholder.svg'}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full h-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </a>
                  {discount > 0 && (
                    <span className="absolute top-3 end-3 z-10 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background shadow-md">
                      -{discount}%
                    </span>
                  )}
                </div>

                <div className="pt-4 px-1">
                  <a href={`/product/${p.slug}`}>
                    <h2 className="font-serif font-medium text-base line-clamp-1 hover:text-[#D4AF37] transition-colors">
                      {p.name}
                    </h2>
                  </a>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-bold text-lg text-[#D4AF37]">
                      {priceNum.toLocaleString('ar-EG')} ج.م
                    </span>
                    {compareNum > 0 && (
                      <del className="text-xs text-muted-foreground">
                        {compareNum.toLocaleString('ar-EG')} ج.م
                      </del>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground font-light">
                    {p.stock > 0
                      ? p.stock <= 5
                        ? 'متبقي عدد قليل'
                        : 'متوفر في المخزن'
                      : 'نفدت الكمية'}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border/20">
                <AddToCart product={p} />
              </div>
            </article>
          );
        })}
      </div>

      {!ps.length && (
        <div className="lux-card mt-16 p-12 text-center rounded-3xl border border-border/40 shadow-sm">
          <p className="text-muted-foreground font-light">لا توجد منتجات مطابقة لبحثك.</p>
        </div>
      )}
    </main>
  );
}
