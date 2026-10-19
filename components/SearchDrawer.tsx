'use client';

import Link from 'next/link';
import { ArrowLeft, LoaderCircle, Search, X } from 'lucide-react';
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
  const [mounted, setMounted] = useState(open);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    const timer = window.setTimeout(() => setMounted(false), 310);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
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

  if (!mounted) return null;

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
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X size={15} /></button>}
          </label>

          <Link href="/shop" onClick={onClose} className="wahaj-search-drawer__discover">
            <span className="wahaj-search-drawer__discover-mark">وَ</span>
            <span className="wahaj-search-drawer__discover-copy">
              <b>اكتشفي عالم وَهَج.</b>
              <strong>اختاري ما يشبهكِ.</strong>
              <small>قطع مختارة بعناية، بتفاصيل تمنح كل إطلالة لمستها الخاصة. تصفّحي المجموعة واكتشفي القطعة الأقرب لذوقكِ.</small>
            </span>
            <ArrowLeft size={17} aria-hidden="true" />
          </Link>

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
