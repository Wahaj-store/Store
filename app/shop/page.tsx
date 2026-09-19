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
    <main className="container py-12">
      {/* رأس صفحة المتجر والعنوان */}
      <div className="mt-2">
        <span className="text-[#D4AF37] text-sm font-medium tracking-wide">Wahaj Store</span>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">المتجر</h1>
        
        {/* شريط البحث الاحترافي */}
        <form className="mt-6 flex gap-2 max-w-xl">
          <input
            name="q"
            defaultValue={q}
            className="flex-1 rounded-xl border border-border/60 bg-[var(--bg)] px-4 py-3 text-sm outline-none focus:border-[#D4AF37] transition-colors"
            placeholder="ابحثي عن منتج أو SKU..."
          />
          <button className="rounded-xl bg-[#D4AF37] text-black font-bold px-6 py-3 text-sm hover:opacity-90 transition-opacity shadow-sm">
            بحث
          </button>
        </form>
      </div>

      {/* التاجز (التصنيفات) بتصميم عصري راقٍ */}
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href="/shop"
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
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
            className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
              category === c.slug
                ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                : 'border border-border/60 hover:border-[#D4AF37] text-foreground/80'
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>

      {/* شبكة المنتجات الاحترافية بدون أي مربعات دفع أسفل الأزرار */}
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-6">
        {ps.map((p) => {
          const discount =
            p.comparePrice && p.comparePrice > p.price
              ? Math.round((1 - p.price / p.comparePrice) * 100)
              : 0;

          return (
            <article
              key={p.id}
              className="group flex flex-col justify-between rounded-2xl border border-border/40 bg-[var(--bg)] p-3 shadow-sm transition-all hover:shadow-md"
            >
              <div>
                <div className="relative overflow-hidden rounded-xl bg-muted/35">
                  <a href={`/product/${p.slug}`}>
                    <img
                      src={p.images[0]?.url || '/placeholder.svg'}
                      alt={p.name}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </a>
                  {discount > 0 && (
                    <span className="absolute top-2.5 end-2.5 rounded-full bg-[#171513] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      -{discount}%
                    </span>
                  )}
                </div>

                <div className="pt-3">
                  <a href={`/product/${p.slug}`}>
                    <h2 className="font-medium text-sm line-clamp-1 hover:text-[#D4AF37] transition-colors">
                      {p.name}
                    </h2>
                  </a>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-bold text-base text-[#D4AF37]">
                      {Number(p.price).toLocaleString('ar-EG')} ج.م
                    </span>
                    {p.comparePrice && (
                      <del className="text-xs text-muted-foreground">
                        {Number(p.comparePrice).toLocaleString('ar-EG')} ج.م
                      </del>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.stock > 0
                      ? p.stock <= 5
                        ? 'متبقي القليل'
                        : 'متوفر'
                      : 'غير متوفر'}
                  </p>
                </div>
              </div>

              {/* زر أضيفي إلى السلة نظيف وخالٍ من أي مربعات مزعجة */}
              <div className="mt-4 pt-2 border-t border-border/20">
                <AddToCart product={p} />
              </div>
            </article>
          );
        })}
      </div>

      {!ps.length && (
        <div className="lux-card mt-12 p-10 text-center rounded-2xl border border-border/40">
          <p className="text-muted-foreground">لا توجد منتجات مطابقة لبحثك.</p>
        </div>
      )}
    </main>
  );
}
