'use client';

import Link from 'next/link';
import { Clock3, ArrowLeft, LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';

type SearchProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  comparePrice: number | null;
  images?: { url: string; alt: string | null }[];
  category?: { name: string } | null;
};

type SearchDrawerProps = {
  open: boolean;
  onClose: () => void;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
};

export default function SearchDrawer({ open, onClose, closeButtonRef }: SearchDrawerProps) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      const stored = JSON.parse(localStorage.getItem('wahaj_recent_searches') || '[]');
      setRecentSearches(Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string').slice(0, 6) : []);
    } catch {
      setRecentSearches([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const value = query.trim();
    if (!value) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(value)}&page=1&sort=newest`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('search_failed');
        const data = await response.json();
        if (currentRequest === requestId.current) {
          setProducts(Array.isArray(data.items) ? data.items.slice(0, 8) : []);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && currentRequest === requestId.current) setProducts([]);
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const saveRecentSearch = (value: string) => {
    const normalized = value.trim().slice(0, 120);
    if (!normalized) return;
    const next = [normalized, ...recentSearches.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try { localStorage.setItem('wahaj_recent_searches', JSON.stringify(next)); } catch { /* التخزين اختياري */ }
  };

  const removeRecentSearch = (value: string) => {
    const next = recentSearches.filter((item) => item !== value);
    setRecentSearches(next);
    try { localStorage.setItem('wahaj_recent_searches', JSON.stringify(next)); } catch { /* التخزين اختياري */ }
  };

  if (!open) return null;

  return (
    <div className={`wahaj-search-drawer-overlay${open ? ' is-open' : ''}`} role="presentation" onMouseDown={onClose}>
      <aside
        id="wahaj-search-drawer"
        className={`wahaj-search-drawer${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wahaj-search-drawer-title"
        dir="rtl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="wahaj-search-drawer__header">
          <div className="wahaj-search-drawer__heading">
            <span className="wahaj-search-drawer__eyebrow">اكتشفي وَهَج</span>
            <h2 id="wahaj-search-drawer-title">ابحثي عن قطعتكِ</h2>
            <p>اكتبي ما يخطر ببالكِ، وسنقترح الأقرب لذوقكِ فورًا.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="wahaj-search-drawer__close" aria-label="إغلاق البحث">
            <X size={19} />
          </button>
        </header>

        <div className="wahaj-search-drawer__body">
          <label className="wahaj-search-drawer__field">
            <Search size={18} aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحثي باسم القطعة أو التصنيف..."
              aria-label="البحث في منتجات وَهَج"
              autoComplete="off"
              enterKeyHint="search"
              onKeyDown={(event) => { if (event.key === 'Enter') saveRecentSearch(query); }}
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={15} /></button>}
          </label>

          {recentSearches.length > 0 && !query.trim() && (
            <section className="wahaj-search-drawer__recent" aria-label="عمليات البحث السابقة">
              <div className="wahaj-search-drawer__recent-heading">
                <span><Clock3 size={14} /> عمليات البحث السابقة</span>
                <button type="button" onClick={() => { setRecentSearches([]); try { localStorage.removeItem('wahaj_recent_searches'); } catch { /* التخزين اختياري */ } }}>مسح الكل</button>
              </div>
              <div className="wahaj-search-drawer__recent-list">
                {recentSearches.map((item) => (
                  <div key={item} className="wahaj-search-drawer__recent-item">
                    <button type="button" onClick={() => setQuery(item)}><Clock3 size={13} /><span>{item}</span></button>
                    <button type="button" onClick={() => removeRecentSearch(item)} aria-label={`حذف البحث ${item}`}><X size={13} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="wahaj-search-drawer__results" aria-live="polite">
            {loading ? (
              <div className="wahaj-search-drawer__status"><LoaderCircle className="wahaj-search-drawer__spin" size={19} /> جارٍ البحث...</div>
            ) : query.trim() ? (
              products.length ? (
                <>
                  <div className="wahaj-search-drawer__results-heading"><span>نتائج البحث</span><b>{products.length}{products.length === 8 ? '+' : ''} قطع</b></div>
                  <div className="wahaj-search-drawer__products">
                    {products.map((product) => (
                      <Link key={product.id} href={`/product/${product.slug}`} onClick={onClose} className="wahaj-search-drawer__product">
                        <span className="wahaj-search-drawer__product-image"><img src={product.images?.[0]?.url || '/placeholder.svg'} alt={product.images?.[0]?.alt || product.name} /></span>
                        <span className="wahaj-search-drawer__product-copy">
                          <small>{product.category?.name || 'وَهَج'}</small>
                          <b>{product.name}</b>
                          <span>{Number(product.price).toLocaleString('ar-EG')} ج.م{product.comparePrice && Number(product.comparePrice) > Number(product.price) ? <del> {Number(product.comparePrice).toLocaleString('ar-EG')} ج.م</del> : null}</span>
                        </span>
                        <ArrowLeft size={14} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                  <Link href={`/shop?q=${encodeURIComponent(query.trim())}`} onClick={onClose} className="wahaj-search-drawer__all">عرض كل النتائج <ArrowLeft size={14} /></Link>
                </>
              ) : (
                <div className="wahaj-search-drawer__status">لم نعثر على قطعة بهذا الاسم. جرّبي كلمة أخرى.</div>
              )
            ) : (
              <div className="wahaj-search-drawer__hint"><Search size={17} /><span>ابدئي الكتابة لتظهر النتائج هنا مباشرة</span></div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
