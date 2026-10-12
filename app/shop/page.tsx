import Link from 'next/link';
import { Suspense } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ShopActiveFilters,
  ShopCatalogHeading,
  ShopCategoriesFallback,
  ShopCategoryNavigation,
  ShopCountFallback,
  ShopGridFallback,
  ShopPagination,
  ShopPaginationFallback,
  ShopProductResults,
  ShopTotalCount,
} from './ShopAsync';
import { parseShopSearchParams, shopHref, type RawShopSearchParams } from '@/lib/shop-query';

// The HTML shell is request-specific; only the public catalog data is cached below.
export const dynamic = 'force-dynamic';

export default function Shop({ searchParams }: { searchParams: RawShopSearchParams }) {
  const state = parseShopSearchParams(searchParams || {});

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
          <aside className="wahaj-shop-hero__aside" aria-label="عدد المنتجات المطابقة">
            <span className="wahaj-shop-hero__aside-kicker">WAHAJ COLLECTION</span>
            <span className="wahaj-shop-hero__aside-rule" />
            <strong><Suspense fallback={<ShopCountFallback />}><ShopTotalCount filters={state.filters} /></Suspense></strong>
            <span className="wahaj-shop-hero__aside-label">منتج مطابق لتصفّحك</span>
            <span className="wahaj-shop-hero__seal" aria-hidden="true">W</span>
          </aside>
        </div>
        <form className="wahaj-shop-search" action="/shop" method="get" role="search">
          {state.category ? <input type="hidden" name="category" value={state.category} /> : null}
          {state.rawMinPrice ? <input type="hidden" name="minPrice" value={state.rawMinPrice} /> : null}
          {state.rawMaxPrice ? <input type="hidden" name="maxPrice" value={state.rawMaxPrice} /> : null}
          {state.inStock ? <input type="hidden" name="stock" value="in-stock" /> : null}
          {state.sort !== 'newest' ? <input type="hidden" name="sort" value={state.sort} /> : null}
          <label className="wahaj-shop-search__field">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">البحث في منتجات المتجر</span>
            <input type="search" name="q" defaultValue={state.q} placeholder="ابحثي باسم القطعة أو رقمها…" maxLength={120} />
            {state.q ? <Link href={shopHref(state, { q: null })} className="wahaj-shop-search__clear" aria-label="مسح البحث"><X size={15} /></Link> : null}
          </label>
          <button type="submit" className="wahaj-shop-search__submit">ابحثي في المتجر <ArrowLeft size={16} /></button>
        </form>
      </section>

      <section className="wahaj-shop-catalog" aria-label="تصفّح المنتجات">
        <Suspense fallback={<div className="wahaj-shop-catalog__heading wahaj-shop-stream-heading" aria-hidden="true"><div className="wahaj-shop-heading-skeleton" /><div className="wahaj-shop-count-skeleton" /></div>}>
          <ShopCatalogHeading state={state} />
        </Suspense>

        <Suspense fallback={<ShopCategoriesFallback />}>
          <ShopCategoryNavigation state={state} />
        </Suspense>

        <section className="wahaj-shop-filter-panel" aria-label="خيارات تصفية المنتجات">
          <div className="wahaj-shop-filter-panel__title"><span className="wahaj-shop-filter-panel__icon"><SlidersHorizontal size={16} /></span><div><b>صمّمي نتائجك</b><small>حدّدي النطاق والترتيب المناسبين</small></div></div>
          <form className="wahaj-shop-filters" action="/shop" method="get">
            {state.q ? <input type="hidden" name="q" value={state.q} /> : null}
            {state.category ? <input type="hidden" name="category" value={state.category} /> : null}
            <label className="wahaj-shop-price-field"><span>السعر من</span><span className="wahaj-shop-price-field__control"><input type="number" name="minPrice" min="0" step="1" inputMode="decimal" defaultValue={state.rawMinPrice} placeholder="0" aria-label="أقل سعر بالجنيه المصري" /><small>ج.م</small></span></label>
            <span className="wahaj-shop-price-separator" aria-hidden="true">—</span>
            <label className="wahaj-shop-price-field"><span>إلى</span><span className="wahaj-shop-price-field__control"><input type="number" name="maxPrice" min="0" step="1" inputMode="decimal" defaultValue={state.rawMaxPrice} placeholder="∞" aria-label="أعلى سعر بالجنيه المصري" /><small>ج.م</small></span></label>
            <label className="wahaj-shop-stock"><input type="checkbox" name="stock" value="in-stock" defaultChecked={state.inStock} /><span className="wahaj-shop-stock__check"><Check size={12} /></span><span>المتوفر فقط</span></label>
            <label className="wahaj-shop-sort"><span className="sr-only">ترتيب المنتجات</span><select name="sort" defaultValue={state.sort}><option value="newest">الأحدث أولًا</option><option value="price-asc">السعر: الأقل أولًا</option><option value="price-desc">السعر: الأعلى أولًا</option><option value="name-asc">الاسم: أ–ي</option></select><ChevronDown size={14} aria-hidden="true" /></label>
            <button type="submit" className="wahaj-shop-filter-submit">تطبيق <ArrowLeft size={14} /></button>
          </form>
        </section>
        {state.invalidPriceRange ? (
          <p className="wahaj-shop-filter-error" role="alert">الحد الأدنى للسعر أكبر من الحد الأعلى. صحّحي النطاق؛ لم نطبّق فلتر السعر على النتائج الحالية.</p>
        ) : null}

        <Suspense fallback={null}><ShopActiveFilters state={state} /></Suspense>
        <Suspense fallback={<ShopGridFallback />}>
          <ShopProductResults state={state} />
        </Suspense>
        <Suspense fallback={<ShopPaginationFallback />}>
          <ShopPagination state={state} />
        </Suspense>
      </section>
    </main>
  );
}
