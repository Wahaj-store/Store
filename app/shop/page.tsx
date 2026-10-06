import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  PackageSearch,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';

export const revalidate = 60;

const PAGE_SIZE = 24;

type ShopSearchParams = {
  q?: string;
  category?: string;
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  stock?: string;
  sort?: string;
};

function getPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getNonNegativeNumber(value: string | undefined) {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function Shop({ searchParams }: { searchParams: ShopSearchParams }) {
  const q = (searchParams.q || '').trim().slice(0, 120);
  const category = searchParams.category?.trim().slice(0, 120) || undefined;
  const minPrice = getNonNegativeNumber(searchParams.minPrice);
  const maxPrice = getNonNegativeNumber(searchParams.maxPrice);
  const requestedPage = getPositiveInt(searchParams.page, 1);
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

  const [total, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);
  const products = await prisma.product.findMany({
    where,
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, category: true },
    orderBy,
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const queryParams = new URLSearchParams();
  if (q) queryParams.set('q', q);
  if (category) queryParams.set('category', category);
  if (minPrice !== undefined) queryParams.set('minPrice', String(minPrice));
  if (maxPrice !== undefined) queryParams.set('maxPrice', String(maxPrice));
  if (stock) queryParams.set('stock', 'in-stock');
  if (sort !== 'newest') queryParams.set('sort', sort);

  const hrefFor = (changes: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams(queryParams);
    params.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    return query ? `/shop?${query}` : '/shop';
  };

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams(queryParams);
    if (targetPage > 1) params.set('page', String(targetPage));
    else params.delete('page');
    const query = params.toString();
    return query ? `/shop?${query}` : '/shop';
  };

  const selectedCategory = categories.find((item) => item.slug === category);
  const categoryLabel = selectedCategory?.name || (category ? 'تصنيف محدد' : 'جميع المنتجات');
  const firstResult = total > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(safePage * PAGE_SIZE, total);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
    const start = Math.max(1, Math.min(safePage - 3, totalPages - 6));
    return start + index;
  }).filter((number) => number <= totalPages);

  const activeFilters = [
    ...(category ? [{ key: 'category', label: categoryLabel }] : []),
    ...(minPrice !== undefined ? [{ key: 'minPrice', label: `من ${minPrice.toLocaleString('ar-EG')} ج.م` }] : []),
    ...(maxPrice !== undefined ? [{ key: 'maxPrice', label: `إلى ${maxPrice.toLocaleString('ar-EG')} ج.م` }] : []),
    ...(stock ? [{ key: 'stock', label: 'المتوفر فقط' }] : []),
  ];

  return (
    <main className="wahaj-shop-redesign" dir="rtl">
      <section className="wahaj-shop-hero" aria-labelledby="shop-title">
        <div className="wahaj-shop-hero__ornament" aria-hidden="true">وَهَج</div>
        <div className="wahaj-shop-hero__layout">
          <div className="wahaj-shop-hero__copy">
            <span className="wahaj-shop-eyebrow"><Sparkles size={14} /> اكتشفي عالم وَهَج</span>
            <h1 id="shop-title">اختاري ما<br /><em>يشبهكِ.</em></h1>
            <p>قطع مختارة بعناية، بتفاصيل تمنح كل إطلالة لمستها الخاصة. تصفّحي المجموعة واكتشفي القطعة الأقرب لذوقك.</p>
            <div className="wahaj-shop-hero__proof">
              <span className="wahaj-shop-hero__proof-mark"><Check size={13} /></span>
              <span>اختيارات وَهَج في مكان واحد</span>
            </div>
          </div>
          <aside className="wahaj-shop-hero__aside" aria-label="معلومات عن مجموعة المتجر">
            <span className="wahaj-shop-hero__aside-kicker">WAHAJ COLLECTION</span>
            <span className="wahaj-shop-hero__aside-rule" />
            <strong>{total.toLocaleString('ar-EG')}</strong>
            <span className="wahaj-shop-hero__aside-label">منتج مطابق لتصفّحك</span>
            <span className="wahaj-shop-hero__seal" aria-hidden="true">W</span>
          </aside>
        </div>
        <form className="wahaj-shop-search" action="/shop" method="get" role="search">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {minPrice !== undefined ? <input type="hidden" name="minPrice" value={minPrice} /> : null}
          {maxPrice !== undefined ? <input type="hidden" name="maxPrice" value={maxPrice} /> : null}
          {stock ? <input type="hidden" name="stock" value="in-stock" /> : null}
          {sort !== 'newest' ? <input type="hidden" name="sort" value={sort} /> : null}
          <label className="wahaj-shop-search__field">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">البحث في منتجات المتجر</span>
            <input type="search" name="q" defaultValue={q} placeholder="ابحثي باسم القطعة أو رقمها…" maxLength={120} />
            {q ? <Link href={hrefFor({ q: undefined })} className="wahaj-shop-search__clear" aria-label="مسح البحث"><X size={15} /></Link> : null}
          </label>
          <button type="submit" className="wahaj-shop-search__submit">ابحثي في المتجر <ArrowLeft size={16} /></button>
        </form>
      </section>

      <section className="wahaj-shop-catalog" aria-label="تصفّح المنتجات">
        <div className="wahaj-shop-catalog__heading">
          <div>
            <span className="wahaj-shop-section-kicker"><span>01</span> اكتشفي التشكيلة</span>
            <h2>{category ? categoryLabel : 'تصفّحي المتجر'}</h2>
            <p>{q ? `نتائج البحث عن «${q}»` : 'اختاري تصنيفك المفضّل أو استخدمي خيارات التصفية للوصول إلى ما تبحثين عنه.'}</p>
          </div>
          <div className="wahaj-shop-results" aria-live="polite">
            <b>{total.toLocaleString('ar-EG')}</b>
            <span>منتج</span>
            <small>{firstResult.toLocaleString('ar-EG')}–{lastResult.toLocaleString('ar-EG')} من {total.toLocaleString('ar-EG')}</small>
          </div>
        </div>

        <nav className="wahaj-shop-categories" aria-label="تصنيفات المنتجات">
          <Link href={hrefFor({ category: undefined })} aria-current={!category ? 'page' : undefined} className={`wahaj-shop-category ${!category ? 'is-active' : ''}`}>
            <span className="wahaj-shop-category__icon"><Sparkles size={14} /></span> جميع المنتجات
          </Link>
          {categories.map((item) => (
            <Link key={item.id} href={hrefFor({ category: item.slug })} aria-current={category === item.slug ? 'page' : undefined} className={`wahaj-shop-category ${category === item.slug ? 'is-active' : ''}`}>
              {item.name}
            </Link>
          ))}
        </nav>

        <section className="wahaj-shop-filter-panel" aria-label="خيارات تصفية المنتجات">
          <div className="wahaj-shop-filter-panel__title"><span className="wahaj-shop-filter-panel__icon"><SlidersHorizontal size={16} /></span><div><b>صمّمي نتائجك</b><small>حدّدي النطاق والترتيب المناسبين</small></div></div>
          <form className="wahaj-shop-filters" action="/shop" method="get">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {category ? <input type="hidden" name="category" value={category} /> : null}
            <label className="wahaj-shop-price-field"><span>السعر من</span><span className="wahaj-shop-price-field__control"><input type="number" name="minPrice" min="0" step="1" inputMode="decimal" defaultValue={minPrice ?? ''} placeholder="0" aria-label="أقل سعر بالجنيه المصري" /><small>ج.م</small></span></label>
            <span className="wahaj-shop-price-separator" aria-hidden="true">—</span>
            <label className="wahaj-shop-price-field"><span>إلى</span><span className="wahaj-shop-price-field__control"><input type="number" name="maxPrice" min="0" step="1" inputMode="decimal" defaultValue={maxPrice ?? ''} placeholder="∞" aria-label="أعلى سعر بالجنيه المصري" /><small>ج.م</small></span></label>
            <label className="wahaj-shop-stock"><input type="checkbox" name="stock" value="in-stock" defaultChecked={stock} /><span className="wahaj-shop-stock__check"><Check size={12} /></span><span>المتوفر فقط</span></label>
            <label className="wahaj-shop-sort"><span className="sr-only">ترتيب المنتجات</span><select name="sort" defaultValue={sort}><option value="newest">الأحدث أولًا</option><option value="price-asc">السعر: الأقل أولًا</option><option value="price-desc">السعر: الأعلى أولًا</option><option value="name-asc">الاسم: أ–ي</option></select><ChevronDown size={14} aria-hidden="true" /></label>
            <button type="submit" className="wahaj-shop-filter-submit">تطبيق <ArrowLeft size={14} /></button>
          </form>
        </section>

        {activeFilters.length > 0 ? (
          <div className="wahaj-shop-active-filters" aria-label="عوامل التصفية النشطة">
            <span>تصفية حسب:</span>
            {activeFilters.map((item) => <Link key={item.key} href={hrefFor({ [item.key]: undefined })} className="wahaj-shop-active-filter">{item.label}<X size={12} /></Link>)}
            <Link href="/shop" className="wahaj-shop-clear-filters"><RotateCcw size={13} /> مسح الكل</Link>
          </div>
        ) : null}

        <div className="wahaj-shop-product-grid">
          {products.map((product) => <ProductCard key={product.id} product={product} variant="shop" />)}
        </div>

        {!products.length ? (
          <div className="wahaj-shop-empty">
            <span className="wahaj-shop-empty__icon"><PackageSearch size={27} /></span>
            <span className="wahaj-shop-section-kicker"><span>لا توجد نتائج</span></span>
            <h3>{q ? 'لم نعثر على القطعة المطلوبة' : 'لا توجد منتجات ضمن هذه الخيارات'}</h3>
            <p>جرّبي تعديل كلمات البحث أو تخفيف عوامل التصفية لتشاهدي المزيد من مجموعة وَهَج.</p>
            <Link href="/shop" className="wahaj-shop-empty__action">عرض جميع المنتجات <ArrowLeft size={15} /></Link>
          </div>
        ) : null}

        {totalPages > 1 ? (
          <nav className="wahaj-shop-pagination" aria-label="صفحات المنتجات">
            <div className="wahaj-shop-pagination__summary">عرض <b>{firstResult.toLocaleString('ar-EG')}–{lastResult.toLocaleString('ar-EG')}</b> من <b>{total.toLocaleString('ar-EG')}</b> منتج</div>
            <div className="wahaj-shop-pagination__controls">
              {safePage > 1 ? <Link href={pageHref(safePage - 1)} className="wahaj-shop-page-arrow"><ArrowRight size={15} /><span>السابق</span></Link> : <span className="wahaj-shop-page-arrow is-disabled"><ArrowRight size={15} /><span>السابق</span></span>}
              {pageNumbers.map((number) => <Link key={number} href={pageHref(number)} aria-current={number === safePage ? 'page' : undefined} className={`wahaj-shop-page-number ${number === safePage ? 'is-active' : ''}`}>{number.toLocaleString('ar-EG')}</Link>)}
              {safePage < totalPages ? <Link href={pageHref(safePage + 1)} className="wahaj-shop-page-arrow"><span>التالي</span><ArrowLeft size={15} /></Link> : <span className="wahaj-shop-page-arrow is-disabled"><span>التالي</span><ArrowLeft size={15} /></span>}
            </div>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
