import Link from 'next/link';
import { ArrowLeft, ArrowRight, PackageSearch, Sparkles, X } from 'lucide-react';
import ShopProductCard from '@/components/ShopProductCard';
import { getShopCategories, getShopProductCount, getShopProducts, SHOP_PAGE_SIZE } from '@/lib/shop-data';
import { shopHref, type ShopSearchState } from '@/lib/shop-query';

export function ShopCountFallback() {
  return <span className="wahaj-shop-count-skeleton" aria-hidden="true" />;
}

export async function ShopTotalCount({ filters }: { filters: ShopSearchState['filters'] }) {
  const count = await getShopProductCount(filters);
  return <>{count.toLocaleString('ar-EG')}</>;
}

export function ShopHeadingFallback() {
  return (
    <div className="wahaj-shop-catalog__heading wahaj-shop-stream-heading" aria-hidden="true">
      <div className="wahaj-shop-heading-skeleton" />
      <div className="wahaj-shop-count-skeleton" />
    </div>
  );
}

export async function ShopCatalogHeading({ state }: { state: ShopSearchState }) {
  const [total, categories] = await Promise.all([
    getShopProductCount(state.filters),
    state.category ? getShopCategories() : Promise.resolve([]),
  ]);
  const selectedCategory = categories.find((category) => category.slug === state.category);
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const safePage = Math.min(state.page, totalPages);
  const firstResult = total ? (safePage - 1) * SHOP_PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(safePage * SHOP_PAGE_SIZE, total);

  return (
    <div className="wahaj-shop-catalog__heading">
      <div>
        <span className="wahaj-shop-section-kicker"><span>01</span> اكتشفي التشكيلة</span>
        <h2>{state.category ? selectedCategory?.name || 'تصفّحي التصنيف' : 'تصفّحي المتجر'}</h2>
        <p>{state.q ? `نتائج البحث عن «${state.q}»` : 'اختاري تصنيفك المفضّل أو استخدمي خيارات التصفية للوصول إلى ما تبحثين عنه.'}</p>
      </div>
      <div className="wahaj-shop-results" aria-live="polite">
        <b>{total.toLocaleString('ar-EG')}</b>
        <span>منتج</span>
        <small>{firstResult.toLocaleString('ar-EG')}–{lastResult.toLocaleString('ar-EG')} من {total.toLocaleString('ar-EG')}</small>
      </div>
    </div>
  );
}

export function ShopCategoriesFallback() {
  return <div className="wahaj-shop-categories wahaj-shop-categories--loading" aria-hidden="true"><span /><span /><span /></div>;
}

export async function ShopCategoryNavigation({ state }: { state: ShopSearchState }) {
  const categories = await getShopCategories();
  return (
    <nav className="wahaj-shop-categories" aria-label="تصنيفات المنتجات">
      <Link href={shopHref(state, { category: null })} aria-current={!state.category ? 'page' : undefined} className={`wahaj-shop-category ${!state.category ? 'is-active' : ''}`}>
        <span className="wahaj-shop-category__icon"><Sparkles size={14} /></span> جميع المنتجات
      </Link>
      {categories.map((item) => (
        <Link key={item.id} href={shopHref(state, { category: item.slug })} aria-current={state.category === item.slug ? 'page' : undefined} className={`wahaj-shop-category ${state.category === item.slug ? 'is-active' : ''}`}>
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

export async function ShopActiveFilters({ state }: { state: ShopSearchState }) {
  const categories = state.category ? await getShopCategories() : [];
  const categoryLabel = categories.find((category) => category.slug === state.category)?.name || state.category;
  const activeFilters = [
    ...(state.category ? [{ key: 'category' as const, label: categoryLabel }] : []),
    ...(!state.invalidPriceRange && state.minPrice !== null ? [{ key: 'minPrice' as const, label: `من ${state.minPrice.toLocaleString('ar-EG')} ج.م` }] : []),
    ...(!state.invalidPriceRange && state.maxPrice !== null ? [{ key: 'maxPrice' as const, label: `إلى ${state.maxPrice.toLocaleString('ar-EG')} ج.م` }] : []),
    ...(state.inStock ? [{ key: 'stock' as const, label: 'المتوفر فقط' }] : []),
  ];
  if (!activeFilters.length) return null;

  return (
    <div className="wahaj-shop-active-filters" aria-label="عوامل التصفية النشطة">
      <span>تصفية حسب:</span>
      {activeFilters.map((item) => <Link key={item.key} href={shopHref(state, { [item.key]: null })} className="wahaj-shop-active-filter">{item.label}<X size={12} /></Link>)}
      <Link href="/shop" className="wahaj-shop-clear-filters"><ArrowLeft size={13} /> مسح الكل</Link>
    </div>
  );
}

export function ShopGridFallback() {
  return (
    <div className="wahaj-shop-product-grid wahaj-shop-product-grid--loading" aria-label="جارٍ تحميل المنتجات" aria-busy="true">
      {Array.from({ length: 8 }, (_, index) => <div className="wahaj-shop-product-skeleton" key={index}><span /><i /><i /><b /></div>)}
    </div>
  );
}

export async function ShopProductResults({ state }: { state: ShopSearchState }) {
  const products = await getShopProducts({ filters: state.filters, page: state.page });
  if (!products.length) {
    return (
      <div className="wahaj-shop-empty">
        <span className="wahaj-shop-empty__icon"><PackageSearch size={27} /></span>
        <span className="wahaj-shop-section-kicker"><span>لا توجد نتائج</span></span>
        <h3>{state.q ? 'لم نعثر على القطعة المطلوبة' : 'لا توجد منتجات ضمن هذه الخيارات'}</h3>
        <p>جرّبي تعديل كلمات البحث أو تخفيف عوامل التصفية لتشاهدي المزيد من مجموعة وَهَج.</p>
        <Link href="/shop" className="wahaj-shop-empty__action">عرض جميع المنتجات <ArrowLeft size={15} /></Link>
      </div>
    );
  }

  return <div className="wahaj-shop-product-grid">{products.map((product) => <ShopProductCard key={product.id} product={product} />)}</div>;
}

export function ShopPaginationFallback() {
  return <div className="wahaj-shop-pagination wahaj-shop-pagination--loading" aria-hidden="true"><span /><span /></div>;
}

export async function ShopPagination({ state }: { state: ShopSearchState }) {
  const total = await getShopProductCount(state.filters);
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  if (totalPages <= 1) return null;

  const safePage = Math.min(state.page, totalPages);
  const firstResult = (safePage - 1) * SHOP_PAGE_SIZE + 1;
  const lastResult = Math.min(safePage * SHOP_PAGE_SIZE, total);
  const start = Math.max(1, Math.min(safePage - 3, totalPages - 6));
  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, index) => start + index);

  return (
    <nav className="wahaj-shop-pagination" aria-label="صفحات المنتجات">
      <div className="wahaj-shop-pagination__summary">عرض <b>{firstResult.toLocaleString('ar-EG')}–{lastResult.toLocaleString('ar-EG')}</b> من <b>{total.toLocaleString('ar-EG')}</b> منتج</div>
      <div className="wahaj-shop-pagination__controls">
        {safePage > 1 ? <Link href={shopHref(state, { page: String(safePage - 1) })} className="wahaj-shop-page-arrow"><ArrowRight size={15} /><span>السابق</span></Link> : <span className="wahaj-shop-page-arrow is-disabled"><ArrowRight size={15} /><span>السابق</span></span>}
        {pageNumbers.map((number) => <Link key={number} href={shopHref(state, { page: number === 1 ? null : String(number) })} aria-current={number === safePage ? 'page' : undefined} className={`wahaj-shop-page-number ${number === safePage ? 'is-active' : ''}`}>{number.toLocaleString('ar-EG')}</Link>)}
        {safePage < totalPages ? <Link href={shopHref(state, { page: String(safePage + 1) })} className="wahaj-shop-page-arrow"><span>التالي</span><ArrowLeft size={15} /></Link> : <span className="wahaj-shop-page-arrow is-disabled"><span>التالي</span><ArrowLeft size={15} /></span>}
      </div>
    </nav>
  );
}
