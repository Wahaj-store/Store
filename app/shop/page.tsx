import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';

export const revalidate = 60;

const PAGE_SIZE = 24;

function getPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getNonNegativeNumber(value: string | undefined) {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function Shop({
  searchParams,
}: {
  searchParams: {
    q?: string;
    category?: string;
    page?: string;
    minPrice?: string;
    maxPrice?: string;
    stock?: string;
    sort?: string;
  };
}) {
  const q = (searchParams.q || '').trim();
  const category = searchParams.category?.trim() || undefined;
  const minPrice = getNonNegativeNumber(searchParams.minPrice);
  const maxPrice = getNonNegativeNumber(searchParams.maxPrice);
  const page = getPositiveInt(searchParams.page, 1);
  const stock = searchParams.stock === 'in-stock';
  const sort = ['newest', 'price-asc', 'price-desc', 'name-asc'].includes(searchParams.sort || '')
    ? searchParams.sort!
    : 'newest';

  const where = {
    status: 'PUBLISHED' as const,
    ...(category ? { category: { slug: category } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { sku: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
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
    ...(stock ? { stock: { gt: 0 } } : {}),
  };

  const orderBy =
    sort === 'price-asc'
      ? { price: 'asc' as const }
      : sort === 'price-desc'
        ? { price: 'desc' as const }
        : sort === 'name-asc'
          ? { name: 'asc' as const }
          : { createdAt: 'desc' as const };

  const [total, ps, cats] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const queryParams = new URLSearchParams();
  if (q) queryParams.set('q', q);
  if (category) queryParams.set('category', category);
  if (minPrice !== undefined) queryParams.set('minPrice', String(minPrice));
  if (maxPrice !== undefined) queryParams.set('maxPrice', String(maxPrice));
  if (stock) queryParams.set('stock', 'in-stock');
  if (sort !== 'newest') queryParams.set('sort', sort);

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams(queryParams);
    if (targetPage > 1) params.set('page', String(targetPage));
    else params.delete('page');
    const query = params.toString();
    return query ? `/shop?${query}` : '/shop';
  };

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

        <form className="mt-8 flex gap-3 max-w-xl" method="get">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {minPrice !== undefined ? <input type="hidden" name="minPrice" value={minPrice} /> : null}
          {maxPrice !== undefined ? <input type="hidden" name="maxPrice" value={maxPrice} /> : null}
          {stock ? <input type="hidden" name="stock" value="in-stock" /> : null}
          {sort !== 'newest' ? <input type="hidden" name="sort" value={sort} /> : null}
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
          href={pageHref(1).replace(category ? `category=${encodeURIComponent(category)}&` : category ? `category=${encodeURIComponent(category)}` : '', '')}
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
            href={`/shop?category=${encodeURIComponent(c.slug)}`}
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

      <form className="mt-6 flex flex-wrap items-center gap-3" method="get">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <label className="flex items-center gap-2 rounded-full border border-border/60 bg-[var(--bg)] px-4 py-2 text-xs">
          <span className="text-muted-foreground">من</span>
          <input name="minPrice" inputMode="decimal" defaultValue={minPrice ?? ''} placeholder="السعر" className="w-20 bg-transparent outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-full border border-border/60 bg-[var(--bg)] px-4 py-2 text-xs">
          <span className="text-muted-foreground">إلى</span>
          <input name="maxPrice" inputMode="decimal" defaultValue={maxPrice ?? ''} placeholder="السعر" className="w-20 bg-transparent outline-none" />
        </label>
        <label className="flex items-center gap-2 rounded-full border border-border/60 bg-[var(--bg)] px-4 py-2 text-xs cursor-pointer">
          <input type="checkbox" name="stock" value="in-stock" defaultChecked={stock} />
          <span>المتوفر فقط</span>
        </label>
        <select name="sort" defaultValue={sort} className="rounded-full border border-border/60 bg-[var(--bg)] px-4 py-2 text-xs outline-none">
          <option value="newest">الأحدث</option>
          <option value="price-asc">السعر: من الأقل للأعلى</option>
          <option value="price-desc">السعر: من الأعلى للأقل</option>
          <option value="name-asc">الاسم</option>
        </select>
        <button className="rounded-full bg-[var(--gold)] text-[var(--gold-contrast)] px-5 py-2.5 text-xs font-semibold shadow-sm">
          تطبيق الفلاتر
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>{total.toLocaleString('ar-EG')} منتج</span>
        <span>صفحة {safePage.toLocaleString('ar-EG')} من {totalPages.toLocaleString('ar-EG')}</span>
      </div>

      <div className="wahaj-product-grid mt-6">
        {ps.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {!ps.length && (
        <div className="lux-card mt-16 p-12 text-center rounded-3xl border border-border/40 shadow-sm">
          <p className="text-muted-foreground font-light">لا توجد منتجات مطابقة لبحثك.</p>
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-12 flex items-center justify-center gap-2" aria-label="صفحات المنتجات">
          {safePage > 1 ? (
            <a href={pageHref(safePage - 1)} className="rounded-full border border-border/60 px-4 py-2 text-xs hover:border-[var(--gold)] transition-colors">
              السابق
            </a>
          ) : null}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
            const start = Math.max(1, Math.min(safePage - 3, totalPages - 6));
            return start + index;
          }).filter((n) => n <= totalPages).map((n) => (
            <a
              key={n}
              href={pageHref(n)}
              aria-current={n === safePage ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-xs transition-colors ${
                n === safePage
                  ? 'bg-[var(--gold)] text-[var(--gold-contrast)] font-bold'
                  : 'border border-border/60 hover:border-[var(--gold)]'
              }`}
            >
              {n.toLocaleString('ar-EG')}
            </a>
          ))}
          {safePage < totalPages ? (
            <a href={pageHref(safePage + 1)} className="rounded-full border border-border/60 px-4 py-2 text-xs hover:border-[var(--gold)] transition-colors">
              التالي
            </a>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
